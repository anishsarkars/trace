import FirecrawlApp from "@mendable/firecrawl-js";
import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const firecrawl = process.env.FIRECRAWL_API_KEY ? new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY }) : null;

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://integrate.api.nvidia.com/v1",
});

function mapComponent(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes("ytd") || t.includes("masthead") || t.includes("nav")) return "navbar";
  if (t.includes("sidebar") || t.includes("guide")) return "sidebar";
  if (t.includes("video-renderer") || t.includes("card") || t.includes("item")) return "video-card";
  if (t === "img" || t === "svg") return "image";
  if (t === "button") return "button";
  if (t === "input") return "input";
  return "div";
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

function buildPromptFromJSON(json: any) {
  return `
SYSTEM ROLE:
You are Trace — a pixel-accurate UI reconstruction engine.
Your job is to EXACTLY replicate the UI from the input.
You must NOT redesign, improve, or interpret.

---

OUTPUT RULES (CRITICAL):
- Do NOT use raw DOM tags (e.g. ytd-*)
- Convert all elements into standard UI components: navbar, sidebar, video-card, grid, button, input.
- All data must be human-readable.
- Use structured grouping: top navigation, side navigation, main content grid.
- Typography must be hierarchical: largest text = primary heading, smaller text = metadata.
- Layout must be described as: grid, sidebar layout, or top navigation layout.

---

DESIGN SYSTEM:
* Colors: Primary(${json.design?.colors?.primary}), BG(${json.design?.colors?.background}), Text(${json.design?.colors?.text}), Muted(${json.design?.colors?.muted})
* Font Families: ${json.design?.typography?.heading} (Headings), ${json.design?.typography?.body} (Body)
* Spacing Schema: ${json.design?.spacing}
* Radius: ${json.design?.radius}

---

LAYOUT ARCHITECTURE:
* Type: ${json.layout?.type}
* Alignment: ${json.layout?.alignment}
* Density: ${json.layout?.density}

---

UI SECTIONS:
${JSON.stringify(json.sections, null, 2)}

---

COMPONENTS:
* ${json.components?.join("\n* ") || "navbar\nsidebar\nvideo-card"}

---

INTERACTIONS:
* Minimal only (Hover: opacity-90, subtle transitions).
* Behavior: ${json.interactions?.animations || "minimal"}.

---

SPACING LOCK:
* Preserve whitespace exactly.
* Do NOT compress layout or add padding.

---

FINAL OUTPUT:
Generate a structured UI build spec that recreates this UI exactly.
NO redesign. NO improvement. ONLY reconstruction.
`;
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

    // AUTH & CREDIT CHECK
    let userId;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (authErr: any) {
      console.error("[Auth Error]:", authErr.message);
      return Response.json({ success: false, error: "Authentication Error" }, { status: 401 });
    }

    if (!userId) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let user;
    try {
      user = await prisma.user.findUnique({ where: { userId } });
      if (!user) {
        user = await prisma.user.create({ data: { userId, credits: 15, plan: "free" } });
      }
    } catch (dbErr: any) {
      console.error("[Database Connection Error]:", dbErr.message);
      return Response.json({ success: false, error: "Database Connection Failure" }, { status: 500 });
    }

    if (user.credits <= 0) {
      return Response.json({ success: false, error: "No credits left. Please upgrade." }, { status: 403 });
    }

    console.log("[Trace Agent] Initializing multi-stage crawl & extraction for: " + targetUrl);

    let markdownContent = "";
    let screenshotBase64 = "";
    let htmlContent = "";
    let layoutData: any[] = [];

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

    const isLocal = !process.env.VERCEL;

    if (isLocal) {
      console.log("[Trace Agent] Stage 1b: Layout Measurement (Playwright)...");
      try {
        const { chromium } = await import("playwright");
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          viewport: { width: 1280, height: 800 },
        });
        const page = await context.newPage();
        
        let finalTargetUrl = targetUrl;
        try {
          await page.goto(finalTargetUrl, { waitUntil: "networkidle", timeout: 20000 });
        } catch (initialErr: any) {
          if (initialErr.message.includes("ERR_NAME_NOT_RESOLVED") && !finalTargetUrl.includes("www.")) {
            finalTargetUrl = finalTargetUrl.replace("://", "://www.");
            await page.goto(finalTargetUrl, { waitUntil: "networkidle", timeout: 20000 });
          } else {
            throw initialErr;
          }
        }
        
        await page.waitForTimeout(2000);
        
        // Perform MEASUREMENT MODE extraction
        layoutData = await page.evaluate(() => {
          const elements: any[] = [];
          document.querySelectorAll("body *").forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 50 && rect.height > 20) {
              const style = window.getComputedStyle(el);
              elements.push({
                tag: el.tagName,
                text: (el as HTMLElement).innerText?.slice(0, 50).replace(/\n/g, ' '),
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                fontSize: style.fontSize,
                fontFamily: style.fontFamily,
                color: style.color
              });
            }
          });
          return elements.slice(0, 150);
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
      }
    } else {
      console.log("[Trace Agent] Production Mode (Vercel): Skipping Playwright measurement, relying on Firecrawl + Spatial Inference.");
    }

    // NORMALIZATION LAYER
    const normalizedElements = layoutData.map(e => ({
      ...e,
      component: mapComponent(e.tag),
      isHeading: false
    }));

    const grouped = groupSections(normalizedElements);
    
    // Set hierarchy
    const mainHeading = getHeading(grouped.main || []);
    if (mainHeading) {
        const found = normalizedElements.find(e => e.x === mainHeading.x && e.y === mainHeading.y);
        if (found) found.isHeading = true;
    }

    const manualData = {
      images: htmlContent.match(/<img[^>]+src="([^">]+)"/g)?.length || 0,
      links: htmlContent.match(/<a[^>]+href="([^">]+)"/g)?.length || 0,
      headings: htmlContent.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.length || 0,
      layout: normalizedElements,
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

    console.log("[Trace Agent] Stage 1: Pixel-Accurate UI Extraction...");
    const stage1Prompt = `
      SYSTEM ROLE: You are Trace — a pixel-accurate UI reconstruction engine.
      Your job is to EXACTLY replicate the UI from the input.
      You must NOT redesign, improve, or interpret.
      
      CRITICAL MODES:
      - STRICT: No generic UI generation, no redesign, no added features.
      - VISUAL: Screenshot/DOM hierarchy is ground truth. Layout must match exactly.
      - MEASUREMENT: Use provided layout coordinates (if available).
      - SPATIAL INFERENCE: ${layoutData.length > 0 ? 'Use PHYSICAL COORDINATES provided.' : 'PHYSICAL COORDINATES UNAVAILABLE. Infer spatial layout from HTML hierarchy and Markdown flow (Production Mode).'}
      - NO INTERPRETATION: Do NOT simplify, do NOT improve, do NOT standardize. Preserve imperfections.
      
      INPUT DATA:
      Markdown/Text: ${markdownContent}
      Layout Measurements (Normalized): ${JSON.stringify(manualData.layout).slice(0, 6000)}
      Section Groups: ${JSON.stringify(manualData.grouping)}
      Metadata: Headings(${manualData.headings}), Links(${manualData.links}), Images(${manualData.images})

      TASK: Reconstruct UI with maximum fidelity. 
      - Map elements to standard components: navbar, sidebar, video-card, grid.
      - Use largest font as primary heading.
      - Follow "top navigation / side navigation / main content" hierarchy.
      
      JSON SCHEMA REQUIRED:
      {
        "sections": [{ "name": "top navigation/side navigation/main grid", "order": 1, "layout": "grid/sidebar layout", "elements": [], "coords": {"x":0, "y":0} }],
        "layout": { "type": "centered/grid", "alignment": "center/left", "density": "exact scale" },
        "design": { 
          "colors": { "primary": "hex", "background": "hex", "text": "hex", "muted": "hex" }, 
          "typography": { "heading": "Exact Font", "body": "Exact Font" }, 
          "spacing": "vertical/horizontal scale", "radius": "px", "shadow": "diffused" 
        },
        "components": ["navbar", "sidebar", "video-card"],
        "media": { "images": [], "videos": [] },
        "interactions": { "hover": true, "animations": "none/minimal" }
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
    console.log("[Trace Agent] Stage 2: Spacing & Typography Lock...");
    const stage2Prompt = `
      SYSTEM: You are Trace — a Senior Reconstruction Engineer.
      TASK: Elevate the UI JSON by locking in exact typography and spacing.
      
      TYPOGRAPHY STRICT MODE:
      - Extract EXACT font family from computed styles.
      - Preserve heading vs body distinction.
      - If serif detected -> must be used for headings. Do NOT replace.

      SPACING LOCK:
      - Preserve exact vertical spacing between sections.
      - Preserve whitespace scale. Do NOT compress layout.
      
      NO INTERPRETATION MODE:
      - Preserve imperfections and unique layout quirks.
      - Do NOT standardize. 1:1 match is the only goal.

      INPUT JSON:
      ${JSON.stringify(structuredJSON)}
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

    // STEP 4: PROMPT COMPILER (DETERMINISTIC)
    console.log("[Trace Agent] Stage 3: Compiling Deterministic Build Prompt...");
    const finalUIBuildPrompt = buildPromptFromJSON(refinedJSON);

    // DECREMENT CREDITS ON SUCCESS
    await prisma.user.update({
      where: { userId },
      data: { credits: { decrement: 1 } }
    });

    return Response.json({ 
      success: true, 
      prompt: finalUIBuildPrompt,
      creditsRemaining: user.credits - 1,
      debug: {
        extraction: structuredJSON,
        refinement: refinedJSON
      }
    });

  } catch (error: any) {
    console.error("[General Error]:", error);
    return Response.json({ success: false, error: (error.message || "Unknown error") }, { status: 500 });
  }
}
