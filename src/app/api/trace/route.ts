import FirecrawlApp from "@mendable/firecrawl-js";
import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const firecrawl = process.env.FIRECRAWL_API_KEY ? new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY }) : null;

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://integrate.api.nvidia.com/v1",
});

function mapComponent(tag: string, el?: any) {
  const t = tag.toLowerCase();
  
  // STEP 2 — DETECT CARD PATTERN
  if (el && detectCard(el)) return "video-card";
  
  if (t.includes("ytd") || t.includes("masthead") || t.includes("nav")) return "navbar";
  if (t.includes("sidebar") || t.includes("guide")) return "sidebar";
  if (t.includes("video-renderer") || t.includes("card") || t.includes("item")) return "video-card";
  if (t === "img" || t === "svg") return "image";
  if (t === "button") return "button";
  if (t === "input") return "input";
  return "div";
}

// STEP 1 — DETECT GRID
function detectGrid(elements: any[]) {
  const rows: Record<number, any[]> = {};

  elements.forEach(el => {
    const y = Math.round(el.y / 100) * 100;
    if (!rows[y]) rows[y] = [];
    rows[y].push(el);
  });

  const gridRows = Object.values(rows).filter(r => r.length >= 3);
  return gridRows.length > 0;
}

// STEP 2 — DETECT CARD PATTERN
function detectCard(el: any) {
  return (
    el.width > 200 &&
    el.height > 150 &&
    el.hasImage
  );
}

function sanitizeText(text: string) {
  if (!text) return "";
  let clean = text.trim().replace(/\s+/g, ' ');
  if (clean.toLowerCase().includes("skip navigation")) return "";
  if (clean === "[object Object]" || clean === "undefined") return "";
  return clean;
}

function groupSections(elements: any[]) {
  // Logic to identify key regions based on coordinates
  const sections = {
    navbar: elements.filter(e => e.y < 100),
    sidebar: elements.filter(e => e.x < 250 && e.y >= 100),
    main: elements.filter(e => e.x >= 250 && e.y >= 100),
  };
  return sections;
}

function getHeading(elements: any[]) {
  if (!elements.length) return null;
  return [...elements].sort((a, b) => {
    const sizeA = parseInt(a.fontSize) || 16;
    const sizeB = parseInt(b.fontSize) || 16;
    return sizeB - sizeA;
  })[0];
}

function getSiteName(url: string) {
  try {
    const hostname = url.includes('://') ? new URL(url).hostname : url.split('/')[0];
    const parts = hostname.replace('www.', '').split('.');
    const name = parts[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch (e) {
    return "Target";
  }
}

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { url } = body;
    if (!url) {
      return Response.json({ success: false, error: "URL is required" }, { status: 400 });
    }

    const targetUrl = url.indexOf('http') === 0 ? url : "https://" + url;
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: "Unauthorized. Please sign in to trace." }, { status: 401 });
    }

    // ⚡ STEP 3 — CREDIT SYSTEM (CORE LOGIC)
    let dbUser = await prisma.user.findUnique({ where: { userId } });
    
    // Create user if not exists
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { userId, credits: 15, plan: "free" }
      });
    }

    if (dbUser.credits <= 0) {
      return Response.json({ success: false, error: "You've reached your monthly limit. Upgrade to Pro for unlimited traces." });
    }

    console.log("[Trace Agent] Initializing multi-stage crawl & extraction for: " + targetUrl);

    let markdownContent = "";
    let screenshotBase64 = "";
    let htmlContent = "";
    let layoutData: any[] = [];
    let extractedImages: any[] = [];
    let extractedVideos: any[] = [];
    let fullCSS: string[] = [];
    let apiData: any[] = [];

    // 🔥 1a. High-Fidelity Capture (Firecrawl v2 API)
    if (process.env.FIRECRAWL_API_KEY) {
      console.log("[Trace Agent] Stage 1a: High-Fidelity Capture (Firecrawl v2)...");
      try {
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v2/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            "url": targetUrl,
            "onlyMainContent": false,
            "maxAge": 172800000,
            "formats": [
              "markdown",
              "summary",
              "links",
              "html",
              "screenshot@fullPage",
              {
                "type": "json",
                "schema": {
                  "type": "object",
                  "properties": {
                    "company_name": { "type": "string" },
                    "company_description": { "type": "string" }
                  }
                }
              },
              "branding",
              "images"
            ]
          })
        });

        const scrapeResult = await firecrawlResponse.json();
        if (scrapeResult.success && scrapeResult.data) {
          const d = scrapeResult.data;
          markdownContent = d.markdown || "";
          screenshotBase64 = d.screenshot || "";
          htmlContent = d.html || "";
          // We can also use d.summary, d.branding, d.links, etc. in future stages
        }
      } catch (fErr: any) {
        console.warn("[Firecrawl v2 Warn]: " + (fErr.message || "Unknown error"));
      }
    }

    let isFallbackMode = false;
    try {
      console.log("[Trace Agent] Stage 1b: Layout Measurement (Playwright)...");
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();

      // ⚡ STEP 1 — CAPTURE NETWORK DATA
      page.on("response", async (response) => {
        try {
          const url = response.url();
          if (url.includes("youtubei") || url.includes("api")) {
            const data = await response.json();
            apiData.push({ url, data });
          }
        } catch (e) {}
      });
      
      let finalTargetUrl = targetUrl;
      try {
        await page.goto(finalTargetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      } catch (initialErr: any) {
        if (initialErr.message.includes("ERR_NAME_NOT_RESOLVED") && !finalTargetUrl.includes("www.")) {
          finalTargetUrl = finalTargetUrl.replace("://", "://www.");
          await page.goto(finalTargetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        } else {
          throw initialErr;
        }
      }
      
      await page.waitForTimeout(3000);
      
      const extractionData = await page.evaluate(() => {
        const elements: any[] = [];
        const pageImages = Array.from(document.querySelectorAll("img")).map(img => ({
          src: img.src,
          width: img.width,
          height: img.height,
          x: img.getBoundingClientRect().x,
          y: img.getBoundingClientRect().y
        }));
        const pageVideos = Array.from(document.querySelectorAll("video")).map(v => ({
          src: v.src,
          width: v.videoWidth,
          height: v.videoHeight
        }));

        document.querySelectorAll("body *").forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 20 && rect.height > 10) {
            const style = window.getComputedStyle(el);
            elements.push({
              tag: el.tagName,
              text: (el as HTMLElement).innerText?.slice(0, 100).replace(/\n/g, ' '),
              x: Math.round(rect.x), y: Math.round(rect.y),
              width: Math.round(rect.width), height: Math.round(rect.height),
              fontSize: style.fontSize, fontFamily: style.fontFamily.split(',')[0].replace(/['"]/g, ''),
              color: style.color, background: style.backgroundColor, display: style.display,
              hasImage: el.querySelector('img') !== null || el.tagName === 'IMG'
            });
          }
        });
        return { elements, images: pageImages.slice(0, 30), videos: pageVideos.slice(0, 10) };
      });

      layoutData = extractionData.elements;
      extractedImages = extractionData.images;
      extractedVideos = extractionData.videos;

      fullCSS = await page.evaluate(() => {
        return Array.from(document.styleSheets).map(sheet => {
          try { return Array.from(sheet.cssRules).map(r => r.cssText); } catch { return []; }
        }).flat();
      });

      if (!screenshotBase64) {
        const screenshot = await page.screenshot({ fullPage: false, type: "jpeg", quality: 80 });
        screenshotBase64 = screenshot.toString("base64");
      }
      await browser.close();
    } catch (crawlError: any) {
      console.warn("[Trace Agent] Local Playwright failed (expected on Vercel). Falling back to Structural HTML Clipping.");
      isFallbackMode = true;
      
      // 🔥 4b. Structural HTML Clipping (Fallback for Vercel)
      if (htmlContent) {
        // Simple regex-based sanitized HTML extraction to capture structure without 10MB of noise
        const sanitizedHTML = htmlContent
          .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmu, '')
          .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmu, '')
          .replace(/<svg\b[^>]*>([\s\S]*?)<\/svg>/gmu, '[SVG]')
          .slice(0, 30000);
          
        htmlContent = sanitizedHTML; // Override with cleaned version for AI context
        
        // Extract links/images from HTML even in fallback
        extractedImages = (htmlContent.match(/<img[^>]+src="([^">]+)"/g) || []).map(m => ({
          src: m.match(/src="([^">]+)"/)?.[1] || ""
        })).slice(0, 15);
      }
    }

    // NORMALIZATION LAYER & SANITIZATION
    const isGridDetected = detectGrid(layoutData);

    // 🔥 3. Layout Clustering
    const clusterByRows = (elements: any[]) => {
      const rows: Record<number, any[]> = {};
      elements.forEach(el => {
        const key = Math.round(el.y / 100) * 100;
        if (!rows[key]) rows[key] = [];
        rows[key].push(el);
      });
      return Object.values(rows);
    };
    const rowClusters = clusterByRows(layoutData);

    // 🔥 4. Pattern Detection
    const detectedPatterns = {
      grid: rowClusters.some(row => row.length >= 3),
      sidebar: layoutData.filter(e => e.x < 250).length > 10,
      navbar: layoutData.some(e => e.y < 80 && e.width > 1000)
    };

    // 🔥 5. Style Token Extraction
    const uniqueColors = [...new Set(layoutData.map(e => e.color))].slice(0, 5);
    const uniqueFonts = [...new Set(layoutData.map(e => e.fontFamily))].slice(0, 3);
    
    const normalizedElements = layoutData
      .map(e => ({
        ...e,
        text: sanitizeText(e.text),
        component: mapComponent(e.tag, e),
        isHeading: false
      }))
      .filter(e => e.text.length > 0 || e.component === "image" || e.component === "button" || e.component === "video-card")
      .slice(0, 200);

    const grouped = groupSections(normalizedElements);
    
    // Set hierarchy
    const mainHeading = getHeading(grouped.main || []);
    if (mainHeading) {
        const found = normalizedElements.find(e => e.x === mainHeading.x && e.y === mainHeading.y);
        if (found) found.isHeading = true;
    }

    const manualData = {
      images: extractedImages,
      videos: extractedVideos,
      api: apiData.slice(0, 5), // Real network data
      css: fullCSS.slice(0, 100), // Sampling top CSS rules
      links: htmlContent.match(/<a[^>]+href="([^">]+)"/g)?.length || 0,
      headings: htmlContent.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.length || 0,
      layout: normalizedElements,
      patterns: detectedPatterns,
      tokens: { colors: uniqueColors, fonts: uniqueFonts },
      isGrid: isGridDetected,
      grouping: {
        nav: grouped.navbar.length,
        sidebar: grouped.sidebar.length,
        main: grouped.main.length
      }
    };

    // STEP 2: AI STAGE 1 — STRUCTURE EXTRACTION
    let structuredJSON: any = null;
    if (!process.env.NVIDIA_API_KEY && !process.env.DEEPSEEK_API_KEY) {
        throw new Error("NVIDIA_API_KEY is missing.");
    }

    console.log("[Trace Agent] Stage 3: Building Structure (JSON Schema)...");
    const stage1Prompt = `
      SYSTEM ROLE: You are Trace — a UI structure identification engine.
      Your task is to take crawled web data and map it into a valid UI schema.
      
      ---
      DATA INTEGRITY RULE (CRITICAL):
      * DO NOT generate placeholder data
      * DO NOT create fake images, titles, or descriptions
      * ONLY use real extracted data
      * If data is missing → mark as "no data" or leave empty
      * NEVER fabricate content.
      
      INPUT DATA:
      Markdown/Text: ${markdownContent.slice(0, 5000)}
      Measurements: ${JSON.stringify(normalizedElements).slice(0, 7000)}
      Section Groups: ${JSON.stringify(manualData.grouping)}

      TASK: Map elements into standard components: [navbar, sidebar, hero, main-content, footer].
      
      // 🔥 6. Schema Builder
      OUTPUT FORMAT (JSON):
      {
        "sections": [{ "name": "string", "type": "navbar/sidebar/hero/main", "elements": [] }],
        "mainContent": {
          "type": "video-grid/list/single",
          "columns": 4,
          "card": { "type": "video-card", "elements": ["thumbnail", "title", "channel", "metadata"] }
        },
        "layout": { "type": "centered/grid/sidebar", "alignment": "center/left", "patterns": ${JSON.stringify(manualData.patterns)} },
        "design": { 
          "colors": { "primary": "${manualData.tokens.colors[0]}", "background": "${manualData.tokens.colors[1] || '#ffffff'}", "text": "${manualData.tokens.colors[2] || '#000000'}" }, 
          "typography": { "heading": "${manualData.tokens.fonts[0]}", "body": "${manualData.tokens.fonts[1] || 'Inter'}" }, 
          "radius": "px"
        },
        "components": ["heading", "subheading", "button", "input", "image", "card", "nav-item"],
        "media": { "images": ${JSON.stringify(manualData.images.slice(0, 8))}, "videos": ${JSON.stringify(manualData.videos.slice(0, 3))} },
        "interactions": { "animations": "minimal" }
      }
    `;

    try {
      const stage1Response = await openai.chat.completions.create({
        model: "meta/llama-3.1-405b-instruct",
        messages: [{ role: "user", content: stage1Prompt }],
        temperature: 0.1, // High precision
        response_format: { type: "json_object" } as any,
      });
      structuredJSON = JSON.parse(stage1Response.choices[0]?.message?.content || "{}");
    } catch (e: any) {
      console.error("[Stage 1 AI Error]:", e.message);
      throw new Error("Core Extraction Engine Failed.");
    }

    // STEP 3: AI STAGE 2 — PRODUCTION REFINEMENT
    console.log("[Trace Agent] Stage 4: AI Refine (Strict Structural Validation)...");
    const stage2Prompt = `
      SYSTEM ROLE:
      You are Trace — a UI structure refinement engine.
      You do NOT generate UI.
      You ONLY refine structured data.

      ---
      DATA INTEGRITY RULE (CRITICAL):
      * DO NOT generate placeholder data
      * DO NOT create fake images, titles, or descriptions
      * ONLY use real extracted data
      * If data is missing → mark as "no data" or leave empty
      * NEVER fabricate content.

      ---
      CRITICAL RULES:
      * DO NOT create UI prompts
      * DO NOT redesign
      * DO NOT hallucinate missing data
      * DO NOT add new sections
      * ONLY clean, validate, and refine given structured data

      ---
      TASK:
      Refine and validate the structure.

      STEP 1 — VALIDATION
      * Remove invalid values: "[object Object]", "undefined", "computed value"
      * Remove empty elements
      * Ensure all fields are valid strings or numbers

      STEP 2 — STRUCTURE CLEANING
      * Ensure sections are correctly grouped: navbar, sidebar, hero, main content
      * Remove empty sections

      STEP 3 — COMPONENT NORMALIZATION
      Convert all elements into semantic UI components:
      * heading, subheading, button, input, image, card, nav-item
      No raw DOM tags allowed.

      STEP 4 — TYPOGRAPHY HIERARCHY
      * Largest font → heading
      * Medium → subheading
      * Small → metadata

      STEP 5 — LAYOUT NORMALIZATION
      Convert layout into: navbar layout, sidebar layout, grid layout, centered layout.
      No low-level CSS allowed.

      STEP 6 — DESIGN SYSTEM VALIDATION
      * Colors must be valid
      * Spacing must be consistent
      * Remove invalid entries.

      INPUT JSON SOURCE:
      ${JSON.stringify(structuredJSON)}

      OUTPUT FORMAT (CLEAN JSON ONLY):
      {
        "sections": [],
        "layout": {},
        "design": {},
        "components": [],
        "interactions": {}
      }
    `;

    let refinedJSON: any = null;
    try {
      const stage2Response = await openai.chat.completions.create({
        model: "meta/llama-3.1-405b-instruct",
        messages: [{ role: "user", content: stage2Prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" } as any,
      });
      refinedJSON = JSON.parse(stage2Response.choices[0]?.message?.content || "{}");
    } catch (e: any) {
      console.warn("[Stage 2 AI Warn]: Refinement failed, using Stage 1 JSON.");
      refinedJSON = structuredJSON;
    }

    // ⚡ STEP 5 — TRACE DESIGN COMPILER (High-Fidelity Studio Spec)
    console.log("[Trace Agent] Stage 5: Compiling High-End Studio Build Specification...");
    const siteName = getSiteName(targetUrl);
    const stage3Prompt = `
      SYSTEM ROLE:
      You are Trace Design Compiler v4 (Studio Edition).
      Your task is to convert structured UI schema into a **precise, high-fidelity Studio Build Specification**.

      ---
      CRITICAL OUTPUT RULES:
      * NO JSON. NO RAW DATA.
      * MANDATORY: Follow the "Studio/Agency" aesthetic structure provided below.
      * DATA INTEGRITY: Use the ACTUAL text, colors, and structure from the input JSON, but map it into the "Premium Studio" components (Liquid Glass, BlurText, etc.) where applicable.
      * OUTPUT FORMAT: Markdown.

      ---
      INPUT REFINED SCHEMA (TARGET: ${siteName}):
      Structured JSON: ${JSON.stringify(refinedJSON)}
      Network API Data: ${JSON.stringify(apiData.slice(0, 5))}
      Fallback Mode: ${isFallbackMode}

      ---
      MANDATORY OUTPUT STRUCTURE (MANDATE THIS EXACT FORMAT):

      # [SITE_NAME] UI BUILD SPECIFICATION (95%+ ACCURACY)

      ---
      ## PROJECT SETUP
      * Framework: React + Vite/Next.js (App Router)
      * Styling system: Tailwind CSS + shadcn/ui
      * Fonts: 
          - Heading: 'Instrument Serif' (italic) — [Include Import Link]
          - Body: 'Barlow' (300, 400, 500, 600) — [Include Import Link]
      * Dependencies: hls.js, motion (framer-motion), lucide-react, tailwindcss-animate

      ---
      ## DESIGN SYSTEM
      * CSS Variables (:root):
          - [Extract dominant colors and map to --background, --foreground, --primary, --border]
      * Typography:
          - Heading Style: font-heading italic text-white tracking-tight leading-[0.9]
          - Body Style: font-body font-light text-white/60 text-sm
      * [LIQUID GLASS CSS DEFINITION]:
          - .liquid-glass (subtle)
          - .liquid-glass-strong (visible)
          - [Include full CSS logic for gradient border masks / backdrop blurs from memory]

      ---
      ## SECTION 1 — NAVBAR (Fixed)
      * Position: Fixed at top-4, z-50.
      * Structure: [Logo] + [Liquid-glass pill with nav links] + [Primary CTA button]
      * Data: [List actual navigation items extracted from JSON]

      ---
      ## SECTION 2 — HERO (Studio Scale)
      * Background: [Video source / Poster fallback from JSON]
      * Content: 
          - Badge Pill: [Liquid-glass badge with "New/Announcement" text]
          - Headline: [BlurText animation component with exact target text]
          - Subtext: [Extract target headline and subtext]
          - CTA: [Detailed Tailwind styling for buttons]

      ---
      ## SECTION 3 — PARTNERS / SOCIAL PROOF
      * Layout: Centered column.
      * Header: [Partner badge]
      * Logos/Names: [List partners/companies extracted from site branding data]

      ---
      ## SECTION 4 — HOW IT WORKS / CAPABILITIES
      * Background: [HLS video strategy (MUX/Cloudfront)]
      * Logic: [Define if chess layout or grid]
      * Data: [Explain how the specific service/product of the site works based on the content]

      ---
      ## SECTION 5 — FEATURES GRID
      * Grid Strategy: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
      * Card Style: liquid-glass rounded-2xl p-6
      * Content: [List feature titles and icons extracted from the trace]

      ---
      ## SECTION 6 — STATS / DATA PROOF
      * Logic: liquid-glass rounded-3xl, 4 columns
      * Highlight Video: [Optional HLS desaturated bg]
      * Data Points: [Extract numbers and labels from the trace results]

      ---
      ## SECTION 7 — TESTIMONIALS
      * Layout: 3-column grid
      * Card Style: liquid-glass rounded-2xl p-8
      * Data: [Extract names, roles, and quotes from the site content]

      ---
      ## SECTION 8 — CTA FOOTER
      * Heading: [Final value proposition text]
      * Buttons: [Primary vs Secondary styles]
      * Links: [List footer links (Privacy/Terms)]

      ---
      ## ITERATIVE REFINEMENT
      Provide a specific prompt for the user to use if visual tweaks are needed.
    `;

    let finalUIBuildSpec: string = "";
    try {
      const stage3Response = await openai.chat.completions.create({
        model: "meta/llama-3.1-405b-instruct",
        messages: [{ role: "user", content: stage3Prompt }],
        temperature: 0.1,
      });
      finalUIBuildSpec = stage3Response.choices[0]?.message?.content || "Failed to compile spec.";
    } catch (e: any) {
      console.error("[Stage 3 AI Error]:", e.message);
      finalUIBuildSpec = `PRODUCTION BUILD SPEC (FALLBACK):\n${JSON.stringify(refinedJSON, null, 2)}`;
    }

    // ⚡ STEP 3 — DEDUCT CREDITS AFTER SUCCESS
    await prisma.user.update({
      where: { userId: dbUser.userId },
      data: { credits: { decrement: 1 } }
    });

    console.log("[Trace Agent] Reconstruction Complete. Credit deducted.");
    return Response.json({ 
      success: true, 
      prompt: finalUIBuildSpec,
      debug: {
        extraction: structuredJSON,
        refinement: refinedJSON,
        network: manualData.api,
        creditsLeft: dbUser.credits - 1
      }
    });

  } catch (error: any) {
    console.error("[General Error]:", error);
    return Response.json({ success: false, error: (error.message || "Unknown error") }, { status: 500 });
  }
}
