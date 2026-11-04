import { config } from "../config/env.js";

const API_URL = `https://graph.instagram.com/${config.apiVersion}/${config.igUserId}/messages`;

async function instagramRequest(body) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.instagramAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Instagram API Error:", data);
    throw new Error(
      data.error?.message || "Instagram API request failed"
    );
  }

  return data;
}

export async function sendInstagramMessage(recipientId, messageText) {
  return instagramRequest({
    recipient: { id: recipientId },
    message: { text: messageText }
  });
}

export async function sendTypingIndicator(recipientId, action) {
  return instagramRequest({
    recipient: { id: recipientId },
    sender_action: action
  });
}



export async function getInstagramProfile(userId) {
  const url = new URL(
  `https://graph.instagram.com/${config.apiVersion}/${userId}`
);
url.searchParams.set("fields",
  "name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user")
 url.searchParams.set(
  "access_token",
  config.instagramAccessToken
);
const response = await fetch(url);
const profile = await response.json();
if(!response.ok) {
    throw new Error(
      profile.error?.message || "Instagram API request failed"
    );
  }
  const userProfile = {
     username : profile.username,
        name : profile.name,
        followerCount : profile.follower_count,
        isFollowing : profile.is_user_follow_business,
        profilePic : profile.profile_pic
  }
return userProfile
}
//getInstagramProfile(17841453699373966)