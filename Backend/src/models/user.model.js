import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    botIgId: {
      type: String,
      required: true,
    },
    instagramId: {
      type: String,
      required: true,
    },
    username: String,
    name: String,
    profilePic: String,
    followerCount: Number,
    isFollowing: {
      type: Boolean,
      default: false,
    },
    firstMessageAt: Date,
    lastMessageAt: Date,
  },
  {
    timestamps: true,
  }
);

// Har client (botIgId) ke liye har user (instagramId) alag aur unique hoga
userSchema.index({ botIgId: 1, instagramId: 1 }, { unique: true });

export const User = mongoose.model("User", userSchema);

