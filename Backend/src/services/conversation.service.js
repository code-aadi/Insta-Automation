import { generateConversationId } from "../helper/conversationId.js";
import { Message } from "../models/message.model.js";

export const getConversationHistory = async (senderId, recipientId) => {
  try {
    
    const conversationId = generateConversationId(senderId, recipientId);

   
    const messageData = await Message.find({ conversationId })
      .select("direction text -_id") 
      .sort({ timestamp: -1 })       
      .limit(6)                      
      .lean();

    return messageData.reverse();
  } catch (error) {
    console.error("DB History Fetch Error:", error.message);
    return []; 
  }
};


