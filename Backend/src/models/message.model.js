import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    botIgId: {
      type: String,
      required: true,
    },
    conversationId: {
      type: String,
      required: true,
    },
    messageId: {
      type: String,
      unique: true,
      sparse: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    recipientId: {
      type: String,
      required: true,
    },
    text: String,
    direction: {
      type: String,
      enum: ["incoming", "outgoing"],
      required: true,
    },
    messageType: {
      type: String,
      default: "text",
    },
    status: {
      type: String,
      enum: ["received", "pending", "sent", "failed", "unknown"],
      default: "received",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);


messageSchema.index({ conversationId: 1, timestamp: -1 });


messageSchema.index({ botIgId: 1, timestamp: -1 });

export const Message = mongoose.model("Message", messageSchema);