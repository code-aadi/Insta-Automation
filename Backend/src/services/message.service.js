
import {
  sendInstagramMessage,
  sendTypingIndicator
} from "./instagram.service.js";

import {delay} from "../helper/delay.js"

export async function handleIncomingMessage(senderId, userMessage) {
  console.log(userMessage)
  const reply = "Thanks for your message!";

  try {
   
    try {
      await sendTypingIndicator(senderId, "typing_on");
    } catch (error) {
      console.error("Typing ON Error:", error.message);
    }

    

    await delay(1500);

   
    try {
      await sendTypingIndicator(senderId, "typing_off");
    } catch (error) {
      console.error("Typing OFF Error:", error.message);
    }

    
    await sendInstagramMessage(senderId, reply);

  } catch (error) {
    console.error("Message Service Error:", error.message);
  }
}
