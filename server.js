import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("✅ Rentboxs AI test server is running");
});

app.post("/interakt/webhook", async (req, res) => {
  try {
    const text = req.body?.text; // adjust this if Interakt sends "message.text"
    console.log("Incoming message:", text);

    // 🔑 TEST FILTER: Only respond if #test is in the message
    if (!text || !text.includes("#test")) {
      console.log("Ignored: no #test keyword found");
      return res.status(200).send({ ok: true, reply: "Ignored - Not a test message" });
    }

    // Remove the #test keyword before sending to OpenAI
    const cleanText = text.replace("#test", "").trim();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: cleanText }]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn’t generate a reply.";

    res.status(200).send({ ok: true, reply });
  } catch (err) {
    console.error("Error in webhook:", err);
    res.status(500).send({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🚀 Running on port", PORT);
});
