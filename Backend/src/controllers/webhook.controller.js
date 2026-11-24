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
      if (!event.message) continue;

      const messageId = event.message.mid;
      const timeStamp = event.timestamp || Date.now();
      if (!messageId) continue;

      // ---- ECHO: bot account se gaya message ----
      if (event.message.is_echo) {
        const echoBotId = event.sender?.id;      // sender = bot
        const echoUserId = event.recipient?.id;  // recipient = user
        if (!echoBotId || !echoUserId || echoBotId === echoUserId) continue;

        handleEchoMessage(
          echoBotId,
          echoUserId,
          event.message,
          messageId,
          timeStamp
        ).catch((error) => {
          console.error("Echo Message Error:", error);
        });
        continue;
      }

      // ---- INCOMING: user ka message ----
      const botIgId = event.recipient?.id || entry.id;
      const senderId = event.sender?.id;
      const userMessage = event.message.text;
      const attachments = event.message.attachments;

      if (!botIgId || !senderId) continue;
      if (senderId === botIgId) continue;

      if (userMessage) {
        handleIncomingMessage(
          botIgId,
          senderId,
          userMessage,
          messageId,
          timeStamp
        ).catch((error) => {
          console.error("Incoming Message Error:", error);
        });
        continue;
      }

      if (attachments?.length) {
        handleMediaMessage(
          botIgId,
          senderId,
          attachments[0].type,
          messageId,
          timeStamp
        ).catch((error) => {
          console.error("Media Message Error:", error);
        });
      }
    }
  }
};