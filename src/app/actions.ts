"use server";

import * as cheerio from "cheerio";

export async function analyzeWebsite(url: string) {
  // Add protocol if missing
  const targetUrl = url.startsWith("http") ? url : `https://${url}`;
  
  try {
    const response = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const title = $("title").text();
    const description = $('meta[name="description"]').attr("content") || "A professional web application.";
    
    // Simulate finding colors (mock analysis)
    const domain = new URL(targetUrl).hostname.replace("www.", "");
    
    return {
      success: true,
      data: {
        title,
        description,
        domain,
        analysis: {
          colors: ["#ffffff", "#000000", "#3b82f6"], // Mocked for now
          components: ["Navbar", "Hero", "Search Bar", "Grid"],
        }
      }
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    return { success: false, error: "Cloud not reachable. Using fallback analysis." };
  }
}
