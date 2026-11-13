import {
  sendInstagramMessage,
  sendTypingIndicator,
  getInstagramProfile
} from "./instagram.service.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { config } from "../config/env.js";
import { retryDatabaseUpdate } from "../helper/retry.js";
import { getConversationHistory } from "./conversation.service.js";
import { getReply } from "./ai.service.js";
import { businessInfo } from "../config/businessInfo.js";
import { generateConversationId } from "../helper/conversationId.js";
import { scheduleReply } from "../helper/scheduleReply.js";


export async function handleIncomingMessage(senderId, incomingMessage, messageId, messageTimeStamp) {
  const conversationId = generateConversationId(senderId, config.igUserId);

  
  try {
    await Message.create({
      conversationId,
      senderId,
      recipientId: config.igUserId,
      messageId,
      direction: "incoming",
      text: incomingMessage,
      messageType: "text",
      status: "received",
      timestamp: new Date(messageTimeStamp),
    });
  } catch (error) {
    if (error.code === 11000) return;
    console.error("Error in storing message", error.message);
    return;
  }

  // 2. Reply ka kaam queue mein daalo (debounce + lock)
  scheduleReply(senderId, () => processReply(senderId, conversationId));
}




async function processReply(senderId, conversationId) {
  let reply = "Thanks for your message!";

  try {
    try {
      await sendTypingIndicator(senderId, "typing_on");
    } catch (error) {
      console.error("Typing ON Error:", error.message);
    }

    
    let history = [];
    try {
      history = await getConversationHistory(senderId, config.igUserId);
    } catch (error) {
      console.error("Error in getting conversation history:", error.message);
    }

    // Profile + follow check
    let userDetails;
    try {
      const instaProfile = await getInstagramProfile(senderId);

      userDetails = await User.findOneAndUpdate(
        { instagramId: senderId },
        {
          $set: { ...instaProfile, lastMessageAt: new Date() },
          $setOnInsert: { firstMessageAt: new Date() },
        },
        { upsert: true, new: true, runValidators: true }
      );

      if (!instaProfile.isFollowing) {
        await sendInstagramMessage(senderId, "Please follow first then we talk! 😊");
        return; 
      }
    } catch (error) {
      console.error("Profile error:", error.message);
    }

    const filteredUserDetails = {
      name: userDetails?.name || userDetails?.username || "friend",
    };

    // AI se reply
    try {
      reply = await getReply({ userDetails: filteredUserDetails, businessInfo, history });
    } catch (error) {
      console.log("reply error", error);
      reply = "Abhi ispe thoda kaam chal rha hai. Thodi der baad try karna.";
    }

    // Outgoing message DB mein save
    let outgoingMessage;
    try {
      outgoingMessage = await Message.create({
        conversationId,
        senderId: config.igUserId,
        recipientId: senderId,
        text: reply,
        direction: "outgoing",
        status: "pending",
        messageType: "text",
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error storing outgoing message:", error.message);
      return;
    }

    // Instagram par bhejo
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
      if (!updated) console.error("Could not update outgoing message status after retries.");
      console.error("Instagram sending error:", error.message);
      return;
    }

    // Status update
    const updateData = { status: "sent" };
    if (upcomingData.message_id) updateData.messageId = upcomingData.message_id;

    const updated = await retryDatabaseUpdate(() =>
      Message.findByIdAndUpdate(
        outgoingMessage._id,
        { $set: updateData },
        { runValidators: true }
      )
    );
    if (!updated) console.error("Instagram message sent, but MongoDB update failed after retries.");

  } catch (error) {
    console.error("Message Service Error:", error);
  } finally {
    try {
      await sendTypingIndicator(senderId, "typing_off");
    } catch (error) {
      console.error("Typing OFF Error:", error.message);
    }
  }
}