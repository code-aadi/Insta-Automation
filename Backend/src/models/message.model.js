import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      index: true, // Direct match ke liye
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

// Ye compound index lagao: conversationId match karega aur instant timestamp sort dega
messageSchema.index({ conversationId: 1, timestamp: -1 });

export const Message = mongoose.model("Message", messageSchema);