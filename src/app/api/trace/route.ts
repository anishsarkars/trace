import FirecrawlApp from "@mendable/firecrawl-js";
import OpenAI from "openai";

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
    console.log("[Trace Agent] Initializing multi-stage crawl & extraction for: " + targetUrl);

    let markdownContent = "";
    let screenshotBase64 = "";
    let htmlContent = "";
    let layoutData: any[] = [];
    let extractedImages: any[] = [];
    let extractedVideos: any[] = [];
    let fullCSS: string[] = [];

    // STEP 1: MULTI-SOURCE CRAWL (Firecrawl for markdown/screenshot, Playwright for measurements)
    if (firecrawl) {
      console.log("[Trace Agent] Stage 1a: High-Fidelity Capture (Firecrawl)...");
      try {
        const scrapeResult = await (firecrawl as any).scrapeUrl(targetUrl, {
          formats: ["markdown", "screenshot", "html"],
          waitFor: 1000,
        });
        if (scrapeResult) {
          markdownContent = scrapeResult.markdown || "";
          screenshotBase64 = scrapeResult.screenshot || "";
          htmlContent = scrapeResult.html || "";
        }
      } catch (fErr: any) {
        console.warn("[Firecrawl Warn]: " + (fErr.message || "Unknown error"));
      }
    }

    console.log("[Trace Agent] Stage 1b: Layout Measurement (Playwright)...");
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    // ⚡ STEP 1 — CAPTURE NETWORK DATA
    const apiData: any[] = [];
    page.on("response", async (response) => {
      try {
        const url = response.url();
        if (url.includes("youtubei") || url.includes("api")) {
          const data = await response.json();
          apiData.push({ url, data });
        }
      } catch (e) {
        // Ignore binary or non-json responses
      }
    });
    
    let finalTargetUrl = targetUrl;
    try {
      try {
        // Change to 'domcontentloaded' as 'networkidle' can hang on sites with long-polling/heartbeats
        await page.goto(finalTargetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      } catch (initialErr: any) {
        if (initialErr.message.includes("ERR_NAME_NOT_RESOLVED") && !finalTargetUrl.includes("www.")) {
          finalTargetUrl = finalTargetUrl.replace("://", "://www.");
          await page.goto(finalTargetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        } else {
          throw initialErr;
        }
      }
      
      // Manual wait to allow some dynamic content to load
      await page.waitForTimeout(3000);
      
      // 🔥 1. Playwright Deep Extraction
      const extractionData = await page.evaluate(() => {
        const elements: any[] = [];
        
        // 🔥 2. Media Extraction
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
          // Filter visible only
          if (rect.width > 20 && rect.height > 10) {
            const style = window.getComputedStyle(el);
            const hasImage = el.querySelector('img') !== null || el.tagName === 'IMG';
            
            elements.push({
              tag: el.tagName,
              text: (el as HTMLElement).innerText?.slice(0, 100).replace(/\n/g, ' '),
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              fontSize: style.fontSize,
              fontFamily: style.fontFamily.split(',')[0].replace(/['"]/g, ''),
              color: style.color,
              background: style.backgroundColor,
              display: style.display,
              hasImage
            });
          }
        });
        
        return {
          elements,
          images: pageImages.slice(0, 30),
          videos: pageVideos.slice(0, 10)
        };
      });

      layoutData = extractionData.elements;
      extractedImages = extractionData.images;
      extractedVideos = extractionData.videos;

      // ⚡ STEP 2 — CAPTURE FULL CSS
      fullCSS = await page.evaluate(() => {
        return Array.from(document.styleSheets)
          .map(sheet => {
            try {
              return Array.from(sheet.cssRules).map(r => r.cssText);
            } catch {
              return [];
            }
          })
          .flat();
      });

      // Fallback for markdown/html if Firecrawl failed
      if (!markdownContent) markdownContent = await page.evaluate(() => document.body.innerText.slice(0, 10000));
      if (!htmlContent) htmlContent = await page.content();
      if (!screenshotBase64) {
        const screenshot = await page.screenshot({ fullPage: false, type: "jpeg", quality: 80 });
        screenshotBase64 = screenshot.toString("base64");
      }
      
      await browser.close();
    } catch (crawlError: any) {
      console.error("[Playwright Error]:", crawlError.message);
      await browser.close();
      if (!markdownContent) throw crawlError;
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
        model: "meta/llama-4-maverick-17b-128e-instruct",
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
        model: "meta/llama-4-maverick-17b-128e-instruct",
        messages: [{ role: "user", content: stage2Prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" } as any,
      });
      refinedJSON = JSON.parse(stage2Response.choices[0]?.message?.content || "{}");
    } catch (e: any) {
      console.warn("[Stage 2 AI Warn]: Refinement failed, using Stage 1 JSON.");
      refinedJSON = structuredJSON;
    }

    // ⚡ STEP 5 — TRACE DESIGN COMPILER
    console.log("[Trace Agent] Stage 5: Compiling High-End UI Build Specification...");
    const siteName = getSiteName(targetUrl);
    const stage3Prompt = `
      SYSTEM ROLE:
      You are Trace Design Compiler.
      Your task is to convert structured UI schema into a **production-grade UI build specification**.

      ---
      CRITICAL RULES:
      * DO NOT output JSON
      * DO NOT output raw data
      * DO NOT simplify
      * Output MUST be:
        * highly structured
        * human-readable
        * implementation-ready

      ---
      INPUT REFINED SCHEMA (TARGET: ${siteName}):
      ${JSON.stringify(refinedJSON)}

      ---
      OBJECTIVE:
      Transform this into a **detailed UI build prompt** similar to high-end design system specs.

      ---
      OUTPUT STRUCTURE (MANDATORY):
      ---
      PROJECT SETUP
      * Framework (React + Next.js App Router)
      * Styling system (Tailwind CSS)
      * Fonts (import links if needed)
      * Dependencies (Framer Motion, Lucide Icons, etc.)

      ---
      DESIGN SYSTEM
      Define:
      * CSS variables (:root)
      * color tokens (background, foreground, accent, muted)
      * font system (display + body)
      * spacing scale
      * border radius
      * shadows

      ---
      LAYOUT SYSTEM
      * Page layout (h-screen, flex, grid)
      * overflow rules
      * container widths

      ---
      NAVIGATION
      * layout (flex, spacing)
      * logo
      * nav items
      * CTA button

      ---
      HERO SECTION
      * structure (centered / split / video background)
      * headline (exact typography)
      * subtext
      * CTA buttons
      * spacing

      ---
      MEDIA / BACKGROUND
      * video or image usage
      * positioning (absolute, object-cover)
      * layering (z-index)

      ---
      ANIMATIONS (IF PRESENT)
      * use Framer Motion
      * define:
        * initial state
        * animate state
        * duration
        * delay

      ---
      MAIN CONTENT (CRITICAL)
      If grid detected:
      * define grid system:
        * columns
        * gap
      * define card structure:
        * thumbnail
        * title
        * metadata

      ---
      ADVANCED COMPONENTS (IF PRESENT)
      * dashboard
      * tables
      * charts
      * sidebar
      Define internal layout clearly.

      ---
      INTERACTIONS
      * hover states
      * button behavior
      * transitions

      ---
      RESPONSIVENESS
      * mobile
      * tablet
      * desktop

      ---
      FINAL RULES:
      * Use exact values from schema
      * Do NOT invent missing features
      * If data is missing → skip, do not fabricate
      * Maintain clarity and hierarchy

      ---
      GOAL:
      Produce a **high-end, production-ready UI build spec** that can be directly used to generate UI in Cursor/Claude.
      Return ONLY the spec text.
    `;

    let finalUIBuildSpec: string = "";
    try {
      const stage3Response = await openai.chat.completions.create({
        model: "meta/llama-4-maverick-17b-128e-instruct",
        messages: [{ role: "user", content: stage3Prompt }],
        temperature: 0,
      });
      finalUIBuildSpec = stage3Response.choices[0]?.message?.content || "Failed to compile spec.";
    } catch (e: any) {
      console.error("[Stage 3 AI Error]:", e.message);
      finalUIBuildSpec = `PRODUCTION BUILD SPEC (FALLBACK):\n${JSON.stringify(refinedJSON, null, 2)}`;
    }

    return Response.json({ 
      success: true, 
      prompt: finalUIBuildSpec,
      debug: {
        extraction: structuredJSON,
        refinement: refinedJSON,
        network: manualData.api
      }
    });

  } catch (error: any) {
    console.error("[General Error]:", error);
    return Response.json({ success: false, error: (error.message || "Unknown error") }, { status: 500 });
  }
}
