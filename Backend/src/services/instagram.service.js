import { config } from "../config/env.js";

async function instagramRequest({ botIgId, accessToken }, body) {
  const apiUrl = `https://graph.instagram.com/${config.apiVersion}/${botIgId}/messages`;
  let response;

  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    error.deliveryStatus = "unknown";
    console.error("Instagram Network Error:", error.message);
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    error.status = response.status;
    error.deliveryStatus =
      response.ok || response.status >= 500 ? "unknown" : "failed";
    console.error("Instagram Response Parsing Error:", error.message);
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      data.error?.message || "Instagram API request failed"
    );
    error.status = response.status;
    error.deliveryStatus = response.status >= 500 ? "unknown" : "failed";
    console.error("Instagram API Error:", data);
    throw error;
  }

  return data;
}

export async function sendInstagramMessage(credentials, recipientId, messageText) {
  return instagramRequest(credentials, {
    recipient: { id: recipientId },
    message: { text: messageText },
  });
}

export async function sendTypingIndicator(credentials, recipientId, action) {
  return instagramRequest(credentials, {
    recipient: { id: recipientId },
    sender_action: action,
  });
}

export async function getInstagramProfile({ accessToken }, userId) {
  const url = new URL(
    `https://graph.instagram.com/${config.apiVersion}/${userId}`
  );
  url.searchParams.set(
    "fields",
    "name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user"
  );

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(15000),
  });

  const profile = await response.json();
  if (!response.ok) {
    throw new Error(profile.error?.message || "Instagram API request failed");
  }

  return {
    username: profile?.username,
    name: profile?.name,
    followerCount: profile.follower_count,
    isFollowing: profile.is_user_follow_business,
    profilePic: profile?.profile_pic,
  };
}

export function buildButtonPayload(text, buttons = []) {
  const clean = buttons
    .filter((b) => b?.title?.trim())
    .slice(0, 3)
    .map((b) =>
      b.type === "postback"
        ? { type: "postback", title: b.title.trim().slice(0, 20), payload: (b.payload || b.title).trim().slice(0, 1000) }
        : { type: "web_url", url: b.url, title: b.title.trim().slice(0, 20) }
    )
    .filter((b) => b.type === "postback" || /^https?:\/\//i.test(b.url || ""));

  if (clean.length === 0) return { text: String(text).slice(0, 1000) };

  return {
    attachment: {
      type: "template",
      payload: { template_type: "button", text: String(text).slice(0, 640), buttons: clean },
    },
  };
}

export async function sendInstagramButtons(credentials, recipientId, text, buttons = []) {
  return instagramRequest(credentials, {
    recipient: { id: recipientId },
    message: buildButtonPayload(text, buttons),
  });
}

// Comment ka one-shot private DM (ek comment par sirf ek baar, 7 din ke andar)
export async function sendPrivateReply(credentials, commentId, text, buttons = []) {
  return instagramRequest(credentials, {
    recipient: { comment_id: String(commentId) },
    message: buildButtonPayload(text, buttons),
  });
}