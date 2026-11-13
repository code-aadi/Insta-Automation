import {
  sendInstagramMessage,
  sendTypingIndicator,
  getInstagramProfile
} from "./instagram.service.js";
import {delay} from "../helper/delay.js"
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { config } from "../config/env.js";
import { retryDatabaseUpdate } from "../helper/retry.js";
import { getConversationHistory } from "./conversation.service.js";
import { getReply } from "./ai.service.js";
import { businessInfo } from "../config/businessInfo.js";
import { generateConversationId } from "../helper/conversationId.js";

export async function handleIncomingMessage(senderId, incomingMessage, messageId, messageTimeStamp) {
 
  let reply = "Thanks for your message!";
  try {
   
    try {
      await sendTypingIndicator(senderId, "typing_on");
    } catch (error) {
      console.error("Typing ON Error:", error.message);
    }

const conversationId = generateConversationId(senderId, config.igUserId)
try {
  await Message.create({
    conversationId : conversationId,
    senderId : senderId,
    recipientId : config.igUserId,
    messageId : messageId,
    direction : "incoming",
    text : incomingMessage,
    messageType : "text",
    status : "received",
    timestamp : new Date(messageTimeStamp)
  })
} catch (error) {
  if(error.code === 11000){
    return
  }
  console.error("Error in storing message", error.message)
  return
}

let history = [];

try {
  history = await getConversationHistory(
    senderId,
    config.igUserId
  ); 
} catch (error) {
  console.error(
    "Error in getting conversation history:",
    error.message
  );
}
let userDetails;
    try {
  const instaProfile = await getInstagramProfile(senderId);

  userDetails = await User.findOneAndUpdate(
    { instagramId: senderId },
    {
      $set: {
        ...instaProfile,
        lastMessageAt: new Date(),
      },
      $setOnInsert: {
        firstMessageAt: new Date(),
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  if (!instaProfile.isFollowing) {
    reply = "Please follow first then we talk! 😊";
    await sendInstagramMessage(senderId, reply); 
    return; 
  }

} catch (error) {
  console.error("Profile error:", error.message);
  
}

const displayName = userDetails.name || userDetails.username || "friend";

const filteredUserDetails = {
  name: displayName
};


    await delay(1500);

   
 try {
   reply = await getReply({userDetails : filteredUserDetails, businessInfo, history})
 } catch (error) {
  console.log("reply error", error)
  reply = "Abhi ispe thoda kaam chal rha hai. Thodi der baad try karna."
 }

  
  let outgoingMessage;
try {
  outgoingMessage = await Message.create({
    conversationId : conversationId,
    senderId: config.igUserId,
    recipientId: senderId,
    text: reply,
    direction: "outgoing",
    status: "pending",
    messageType: "text",
    timestamp : new Date()
  });
} catch (error) {
  console.error("Error storing outgoing message:", error.message);
  return;
}


let upcomingData;

try {
  upcomingData = await sendInstagramMessage(senderId, reply);

} catch (error) {
  const finalStatus = error.deliveryStatus || "unknown";

  const updated = await retryDatabaseUpdate(() =>
    Message.findByIdAndUpdate(
      outgoingMessage._id,
      { $set: { status: finalStatus } },
      { runValidators: true }
    )
  );

  if (!updated) {
    console.error(
      "Could not update outgoing message status after retries."
    );
  }

  console.error("Instagram sending error:", error.message);
  return;
}

// Instagram API successful: update database
const updateData = {
  status: "sent"
};

if (upcomingData.message_id) {
  updateData.messageId = upcomingData.message_id;
}

const updated = await retryDatabaseUpdate(() =>
  Message.findByIdAndUpdate(
    outgoingMessage._id,
    { $set: updateData },
    { runValidators: true }
  )
);

if (!updated) {
  console.error(
    "Instagram message sent, but MongoDB update failed after retries."
  );
}
 

    
  } catch (error) {
    console.error("Message Service Error:", error);
  }finally{
 try {
      await sendTypingIndicator(senderId, "typing_off");
    } catch (error) {
      console.error("Typing OFF Error:", error.message);
    }
  }
}



