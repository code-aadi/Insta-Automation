import { config } from "../config/env.js";
import {
  handleIncomingMessage,
  handleMediaMessage,
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

  if (body.object !== "instagram") {
    return;
  }

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message) continue;
      if (event.message.is_echo) continue;

      const senderId = event.sender?.id;
      const messageId = event.message.mid;
      const userMessage = event.message.text;
      const attachments = event.message.attachments;
      const timeStamp = event.timestamp || Date.now();

      if (!senderId || !messageId) continue;

      
      if (userMessage) {
        handleIncomingMessage(senderId, userMessage, messageId, timeStamp).catch(
          (error) => {
            console.error("Incoming Message Error:", error);
          }
        );
        continue;
      }

      
      if (attachments?.length) {
        handleMediaMessage(senderId, attachments[0].type).catch((error) => {
          console.error("Media Message Error:", error);
        });
      }
    }
  }
};




