
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    unique: true,
    required: true
  },
  senderId: {
    type: String,
    required: true
  },
  recipientId: {
    type: String,
    required: true
  },
  text: String,
  direction: {
    type: String,
    enum: ["incoming", "outgoing"],
    required: true
  },
  messageType: {
    type: String,
    default: "text"
  },
  status: {
    type: String,
    default: "received"
  },
  timestamp: Date
}, {
  timestamps: true
});

export const Message = mongoose.model("Message", messageSchema);
