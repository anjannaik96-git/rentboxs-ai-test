import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // load .env file

const app = express();
app.use(express.json());

// ----------- AI Function -----------
async function askAI(userText) {
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Rentboxs’ WhatsApp AI assistant. Reply short and clear." },
          { role: "user", content: userText }
        ],
        max_tokens: 100,
        temperature: 0.5
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("❌ OpenAI HTTP error:", resp.status, resp.statusText);
      console.error("❌ OpenAI response body:", JSON.stringify(data, null, 2));
      return `OpenAI error ${resp.status}: ${data?.error?.message || "Unknown"}`;
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error("⚠️ No content in OpenAI response:", JSON.stringify(data, null, 2));
      return "No content returned by model.";
    }

    return content;

  } catch (e) {
    console.error("❌ askAI exception:", e);
    return "Exception calling OpenAI. Check logs.";
  }
}

// ----------- Routes -----------

// Webhook endpoint for Interakt
app.post("/interakt/webhook", async (req, res) => {
  const body = req.body || {};
  const text = body.text || "";
  console.log("📩 Incoming:", text);

  // only respond if message is "test" (for now)
  if (text.toLowerCase() !== "test") {
    return res.json({ ok: true, ignored: true });
  }

  const reply = await askAI(text);
  console.log("🤖 Reply:", reply);

  res.json({ ok: true, reply });
});

// Basic test route
app.get("/", (_, res) => res.send("✅ Rentboxs AI test server is running"));

// ----------- Start Server -----------
app.listen(process.env.PORT || 8080, () => {
  console.log("🚀 Running on port", process.env.PORT || 8080);
});
