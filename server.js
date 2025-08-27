// server.js (ESM) — robust body parsing + many text paths
import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();

// Keep the raw body (useful for signature) and support both JSON & form-encoded
function keepRaw(req, _res, buf) {
  if (buf?.length) req.rawBody = buf.toString("utf8");
}
app.use(express.json({ verify: keepRaw }));
app.use(express.urlencoded({ extended: true, verify: keepRaw }));

const INTERAKT_SECRET = process.env.INTERAKT_SECRET || "Invest@1%";

// Optional signature verification (non-blocking for testing)
function verifySignature(req, _res, next) {
  try {
    const sig = req.headers["x-interakt-signature"];
    if (!sig) return next(); // skip while testing

    const payload = req.rawBody || JSON.stringify(req.body || {});
    const hmac = crypto.createHmac("sha256", INTERAKT_SECRET).update(payload).digest("hex");
    if (hmac !== sig) {
      console.log("⚠️ Signature mismatch (continuing for testing)");
    }
  } catch (e) {
    console.log("Signature check skipped:", e.message);
  }
  next();
}

app.get("/", (_req, res) => {
  res.send("✅ Rentboxs AI test server is running");
});

// Helper to safely read nested properties
const g = (o, p, d) => p.split(".").reduce((a, k) => (a && a[k] !== undefined ? a[k] : undefined), o) ?? d;

function extractText(body) {
  // Try many common spots Interakt/WhatsApp payloads use
  const candidates = [
    body?.text,
    body?.message?.text,
    body?.message?.content?.text,
    body?.message?.body?.text,
    body?.payload?.text,
    body?.payload?.message?.text,
    body?.messages?.[0]?.text,
    body?.messages?.[0]?.content?.text,
    body?.data?.message?.text,
    body?.data?.messages?.[0]?.text,
    // WhatsApp Cloud style:
    g(body, "entry.0.changes.0.value.messages.0.text.body"),
    g(body, "entry.0.changes.0.value.messages.0.button.text"),
    g(body, "entry.0.changes.0.value.messages.0.interactive.button_reply.title"),
    // Sometimes keys are capitalized or named Body
    body?.Body,
    body?.body,
  ];

  return candidates.find((v) => typeof v === "string" && v.trim().length > 0) || "";
}

app.post("/interakt/webhook", verifySignature, async (req, res) => {
  // Log a compact view of the incoming body for debugging
  try {
    console.log("Webhook body:", JSON.stringify(req.body).slice(0, 1000));
  } catch {
    console.log("Webhook body: [unserializable]");
  }

  // If body parser didn’t populate (e.g., unexpected content-type), try raw JSON
  if (!req.body || Object.keys(req.body).length === 0) {
    try {
      if (req.rawBody && req.headers["content-type"]?.includes("application/json")) {
        req.body = JSON.parse(req.rawBody);
        console.log("Parsed body from raw JSON.");
      }
    } catch (e) {
      console.log("Failed to parse raw JSON:", e.message);
    }
  }

  const text = extractText(req.body);
  console.log("Incoming message:", text || "undefined");

  if (!/#test\b/i.test(text)) {
    console.log("Ignored: no #test keyword found");
    return res.json({ ok: true }); // acknowledge without reply
  }

  return res.json({ ok: true, reply: "Hello! How can I assist you today?" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Running on port", PORT);
});
