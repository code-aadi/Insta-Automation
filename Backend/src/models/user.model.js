
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  instagramId: {
    type: String,
    required: true,
    unique: true
  },
  username: String,
  name: String,
  profilePic: String,
  followerCount: Number,
  isFollowing: {
    type: Boolean,
    default: false
  },
  firstMessageAt: Date,
  lastMessageAt: Date
}, {
  timestamps: true
});

export const User = mongoose.model("User", userSchema);
