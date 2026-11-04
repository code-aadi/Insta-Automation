import { config } from "../config/env.js";

import { handleIncomingMessage } from "../services/message.service.js";


export const verifyWebhook = async(req,res)=>{
     const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.verifyToken) {

    

    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}



export const receiveWebhook = async (req, res) => {
  
  res.status(200).send("EVENT_RECEIVED");

  const body = req.body;

  if (body.object !== "instagram") {
    return;
  }

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {

      if (!event.message) {
  continue;
}
      if (event.message?.is_echo) {
        continue;
      }

      const senderId = event.sender?.id;
      const userMessage = event.message?.text;
      const messageId = event.message.mid;

      if (!senderId || !userMessage || !messageId) {
        continue;
      }

      handleIncomingMessage(senderId, userMessage, messageId)
        .catch(error => {
          console.error("Incoming Message Error:", error);
        });
    }
  }
};




