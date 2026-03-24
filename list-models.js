const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyCOmrMFUZOILs70i7TQjZAE8b8QPcH-uPk");

async function run() {
  const apiKey = "6fc111a2fb397282aa15203ee4a311dd";
  try {
    const list = await fetch(`https://api.bytez.com/v1/models`, {
      headers: { "Authorization": `Key ${apiKey}` }
    });
    const data = await list.json();
    if (data.models) {
      const llamaModels = data.models.filter(m => m.name.toLowerCase().includes('llama'));
      console.log(JSON.stringify(llamaModels.map(m => m.name), null, 2));
    } else {
      console.log("No models found:", data);
    }
  } catch (err) {
    console.error("Fetch models failed:", err.message);
  }
}

run();
