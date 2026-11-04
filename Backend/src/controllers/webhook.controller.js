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
console.log(event)
      if (event.message?.is_echo) {
        continue;
      }

      const senderId = event.sender?.id;
      const userMessage = event.message?.text;

      if (!senderId || !userMessage) {
        continue;
      }

      handleIncomingMessage(senderId, userMessage)
        .catch(error => {
          console.error("Incoming Message Error:", error);
        });
    }
  }
};




async function getdetails(){
  console.log("fetching details")
  try {
    const data = await fetch(`https://graph.instagram.com/v26.0/1863649487931154\?fields=name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user\
  &access_token=${config.instagramAccessToken}`)
  const profile = await data.json()
  console.log(profile)
  } catch (error) {
    console.log(error)
  }
}

getdetails()