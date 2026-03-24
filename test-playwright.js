const { chromium } = require("playwright");

async function run() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  console.log("Browser launched successfully.");
  const page = await browser.newPage();
  console.log("Navigating to https://apple.com...");
  try {
    const response = await page.goto("https://apple.com", { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log("Status Code:", response.status());
    console.log("Title:", await page.title());
  } catch (err) {
    console.error("Navigation failed:", err.message);
  }
  await browser.close();
}

run().catch(console.error);
