// server.js
require("dotenv").config();
const express = require("express");

const app = express();

// Parse JSON safely (Interakt sends application/json)
app.use(express.json({ limit: "1mb" }));

// --- Utilities ---------------------------------------------------------

/**
 * Try to find the user's message text in a variety of likely Interakt payload locations.
 * We’ll log the whole payload so we can adjust once we see the *exact* shape.
 */
function extractTextFromInterakt(body) {
  try {
    // Common WhatsApp-like webhook shapes
    if (body?.messages?.[0]?.text?.body) return body.messages[0].text.body;
    if (body?.messages?.[0]?.text) return body.messages[0].text;
    if (body?.message?.text?.body) return body.message.text.body;
    if (body?.message?.text) return body.message.text;

    // Interakt examples (varies by product/flow)
    if (body?.data?.message) return body.data.message;
    if (body?.payload?.message) return body.payload.message;
    if (body?.incoming_message) return body.incoming_message;
    if (body?.message_text) return body.message_text;

    // Fallbacks that sometimes appear
    if (typeof body?.message === "string") return body.message;
    if (typeof body?.text === "string") return body.text;

    return undefined;
  } catch (e) {
    return undefined;
  }
}

// --- Routes ------------------------------------------------------------

// Health check
app.get("/", (_req, res) => {
  res.type("text").send("✅ Rentboxs AI test server is running");
});

// Interakt webhook
app.post("/interakt/webhook", async (req, res) => {
  // 1) Log the *entire* payload so we can see where the message lives
  console.log("Webhook received:\n", JSON.stringify(req.body, null, 2));

  // 2) Try to extract message text
  const userText = extractTextFromInterakt(req.body);
  console.log("Extracted userText =", userText);

  // 3) Simple keyword demo (your real logic can go here)
  let reply;
  if (!userText) {
    reply = "Ignored: no message text found in payload.";
  } else if (/#test\b/i.test(userText)) {
    reply = "Test received ✅ How can I assist you today?";
  } else if (/hello|hi|hey/i.test(userText)) {
    reply = "Hello! 👋 How can I help you?";
  } else {
    reply = "Got it! Thanks for your message.";
  }

  // 4) Return quickly (Interakt generally just needs a 200)
  res.json({ ok: true, reply });
});

// --- Server bind (Render needs PORT) -----------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Running on port", PORT);
});
