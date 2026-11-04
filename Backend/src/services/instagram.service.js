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
