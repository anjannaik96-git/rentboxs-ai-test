// server.js  (ESM)
import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(express.json());

// Optional: secret for signature checks (Interakt modal showed "Invest@1%" in your screenshot).
// For production, set this in Render as an env var INTERAKT_SECRET.
const INTERAKT_SECRET = process.env.INTERAKT_SECRET || "Invest@1%";

// (Optional) Lightweight signature check; non-blocking while testing
function verifySignature(req, _res, next) {
  try {
    const sig = req.headers["x-interakt-signature"];
    if (!sig) return next(); // skip during testing

    const payload = JSON.stringify(req.body || {});
    const hmac = crypto.createHmac("sha256", INTERAKT_SECRET).update(payload).digest("hex");
    if (hmac !== sig) {
      console.log("⚠️ Signature mismatch (continuing for testing)");
    }
  } catch (err) {
    console.log("Signature check skipped:", err.message);
  }
  next();
}

app.get("/", (_req, res) => {
  res.send("✅ Rentboxs AI test server is running");
});

app.post("/interakt/webhook", verifySignature, async (req, res) => {
  const text =
    req.body?.text ||
    req.body?.message?.text ||
    req.body?.payload?.text ||
    "";

  console.log("Incoming message:", text || "undefined");

  if (!/#test\b/i.test(text)) {
    console.log("Ignored: no #test keyword found");
    return res.json({ ok: true }); // acknowledge without reply
  }

  // Test reply
  return res.json({ ok: true, reply: "Hello! How can I assist you today?" });
});

// IMPORTANT for Render – bind to the port they provide
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Running on port", PORT);
});
