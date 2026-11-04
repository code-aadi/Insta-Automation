import {
  sendInstagramMessage,
  sendTypingIndicator,
  getInstagramProfile
} from "./instagram.service.js";
import {delay} from "../helper/delay.js"
import { User } from "../models/user.model.js";

export async function handleIncomingMessage(senderId, userMessage, messageId) {
 
  let reply = "Thanks for your message!";
  try {
   
    try {
      await sendTypingIndicator(senderId, "typing_on");
    } catch (error) {
      console.error("Typing ON Error:", error.message);
    }

     try {
       const instaProfile = await getInstagramProfile(senderId)
       
       const userData = await User.findOneAndUpdate(
        {instagramId : senderId}, 
       {$set : {
        ...instaProfile,
        lastMessageAt : new Date()
       }, $setOnInsert : {
        firstMessageAt : new Date()
       }}
      ,{upsert : true, new : true , runValidators : true})

       if(!instaProfile.is_user_follow_business){
        reply = 'Please follow first then we talk'
       }
    } catch (error) {
            console.error("Profile error:", error.message);

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
