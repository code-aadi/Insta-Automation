import {
  handleIncomingMessage,
  handleMediaMessage,
  handleEchoMessage,
} from "../services/message.service.js";


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
    for (const event of entry.messaging || []) {
      const timeStamp = event.timestamp || Date.now();

      // ---- BUTTON TAP (postback) ----
      if (event.postback) {
        const botIgId = event.recipient?.id || entry.id;
        const senderId = event.sender?.id;
        const text = event.postback.payload || event.postback.title;
        if (!botIgId || !senderId || !text || senderId === botIgId) continue;

        handleIncomingMessage(
          botIgId,
          senderId,
          text,
          `pb_${senderId}_${timeStamp}`,
          timeStamp
        ).catch((error) => console.error("Postback Error:", error));
        continue;
      }

      if (!event.message) continue;

      const messageId = event.message.mid;
      if (!messageId) continue;

      // ---- ECHO ----
      if (event.message.is_echo) {
        const echoBotId = event.sender?.id;
        const echoUserId = event.recipient?.id;
        if (!echoBotId || !echoUserId || echoBotId === echoUserId) continue;

        handleEchoMessage(
          echoBotId,
          echoUserId,
          event.message,
          messageId,
          timeStamp
        ).catch((error) => console.error("Echo Message Error:", error));
        continue;
      }

      // ---- INCOMING ----
      const botIgId = event.recipient?.id || entry.id;
      const senderId = event.sender?.id;
      const quickPayload = event.message.quick_reply?.payload;
      const userMessage = quickPayload || event.message.text;
      const attachments = event.message.attachments;

      if (!botIgId || !senderId || senderId === botIgId) continue;

      if (userMessage) {
        handleIncomingMessage(
          botIgId,
          senderId,
          userMessage,
          messageId,
          timeStamp
        ).catch((error) => console.error("Incoming Message Error:", error));
        continue;
      }

      if (attachments?.length) {
        handleMediaMessage(
          botIgId,
          senderId,
          attachments[0].type,
          messageId,
          timeStamp
        ).catch((error) => console.error("Media Message Error:", error));
      }
    }
  }
};