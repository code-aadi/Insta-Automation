import crypto from "crypto";
import { config } from "../config/env.js";

/**
 * Meta ka X-Hub-Signature-256 verify karta hai (HMAC-SHA256 of raw body).
 * Sirf POST /webhook par lagta hai. GET verification (hub.challenge) alag hai.
 */
export const verifyWebhookSignature = (req, res, next) => {
  if (!config.igAppSecret) {
    console.error("[Webhook] IG_APP_SECRET missing in .env");
    return res.sendStatus(403);
  }

  const header = req.get("x-hub-signature-256") || "";
  if (!header.startsWith("sha256=") || !req.rawBody) {
    console.warn("[Webhook] Signature header missing — rejected");
    return res.sendStatus(403);
  }

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", config.igAppSecret)
      .update(req.rawBody)
      .digest("hex");

  const received = Buffer.from(header, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");

  // Length check pehle, warna timingSafeEqual throw karta hai
  if (
    received.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(received, expectedBuf)
  ) {
    console.warn("[Webhook] Invalid signature — rejected");
    return res.sendStatus(403);
  }

  return next();
};