import { config } from "../config/env.js";
import {
  handleIncomingMessage,
  handleMediaMessage,
  handleEchoMessage,
} from "../services/message.service.js";
import { handleCommentEvent,
  handleCommentPostback,
  isCommentPayload, } from "../services/comment.service.js";
export const verifyWebhook = async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === config.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

export const receiveWebhook = async (req, res) => {
  res.status(200).send("EVENT_RECEIVED");

  const body = req.body;
  if (!body || body.object !== "instagram") return;

  for (const entry of body.entry || []) {
    const entryBotId = entry.id;

    // ---------- COMMENTS (entry.changes, NOT entry.messaging) ----------
    for (const change of entry.changes || []) {
      if (change.field !== "comments") continue;
      handleCommentEvent(entryBotId, change.value, entry.time || Date.now()).catch((e) =>
        console.error("Comment Event Error:", e)
      );
    }

    // ---------- MESSAGING ----------
    for (const event of entry.messaging || []) {
      const timeStamp = event.timestamp || Date.now();

      // Button tap
      if (event.postback) {
        const botIgId = event.recipient?.id || entryBotId;
        const senderId = event.sender?.id;
        const payload = event.postback.payload || event.postback.title;
        if (!botIgId || !senderId || !payload || senderId === botIgId) continue;

        if (isCommentPayload(payload)) {
          handleCommentPostback(botIgId, senderId, payload).catch((e) =>
            console.error("Comment Postback Error:", e)
          );
        } else {
          handleIncomingMessage(botIgId, senderId, payload, `pb_${senderId}_${timeStamp}`, timeStamp)
            .catch((e) => console.error("Postback Error:", e));
        }
        continue;
      }

      if (!event.message) continue;
      const messageId = event.message.mid;
      if (!messageId) continue;

      // Echo (bot reply / manual reply)
      if (event.message.is_echo) {
        const echoBotId = event.sender?.id;
        const echoUserId = event.recipient?.id;
        if (!echoBotId || !echoUserId || echoBotId === echoUserId) continue;
        handleEchoMessage(echoBotId, echoUserId, event.message, messageId, timeStamp)
          .catch((e) => console.error("Echo Message Error:", e));
        continue;
      }

      const botIgId = event.recipient?.id || entryBotId;
      const senderId = event.sender?.id;
      const userMessage = event.message.quick_reply?.payload || event.message.text;
      const attachments = event.message.attachments;

      if (!botIgId || !senderId || senderId === botIgId) continue;

      if (userMessage) {
        // Comment flow ka text fallback ("haan", "done" type kare button ki jagah)
        if (isCommentPayload(userMessage)) {
          handleCommentPostback(botIgId, senderId, userMessage).catch((e) =>
            console.error("Comment QuickReply Error:", e)
          );
          continue;
        }
        handleIncomingMessage(botIgId, senderId, userMessage, messageId, timeStamp)
          .catch((e) => console.error("Incoming Message Error:", e));
        continue;
      }

      if (attachments?.length) {
        handleMediaMessage(botIgId, senderId, attachments[0].type, messageId, timeStamp)
          .catch((e) => console.error("Media Message Error:", e));
      }
    }
  }
};