import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { Account } from "../models/account.model.js";
import { encrypt } from "../helper/crypto.js";

function createOAuthState() {
  return jwt.sign(
    { purpose: "ig_oauth", nonce: crypto.randomBytes(8).toString("hex") },
    config.jwtSecret,
    { expiresIn: "10m" }
  );
}

export function verifyOAuthState(state) {
  if (!state) return false;
  try {
    const decoded = jwt.verify(state, config.jwtSecret);
    return decoded?.purpose === "ig_oauth";
  } catch {
    return false;
  }
}

export function getInstagramAuthUrl() {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", config.igAppId);
  url.searchParams.set("redirect_uri", config.igRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.igScopes);
  url.searchParams.set("force_reauth", "true");
  url.searchParams.set("state", createOAuthState());
  return url.toString();
}

async function exchangeCodeForShortToken(rawCode) {
  const code = rawCode.replace(/#_$/, "").trim();

  const body = new URLSearchParams({
    client_id: config.igAppId,
    client_secret: config.igAppSecret,
    grant_type: "authorization_code",
    redirect_uri: config.igRedirectUri,
    code,
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json();
  const tokenData = data?.data?.[0] || data;

  if (!response.ok || !tokenData?.access_token) {
    throw new Error(
      data?.error_message || data?.error?.message || "Short-lived token exchange failed"
    );
  }

  return tokenData.access_token;
}

async function exchangeForLongLivedToken(shortToken) {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", config.igAppSecret);
  url.searchParams.set("access_token", shortToken);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json();

  if (!response.ok || !data?.access_token) {
    throw new Error(
      data?.error?.message || "Long-lived token exchange failed"
    );
  }

  return data; // { access_token, token_type, expires_in }
}

async function getOwnInstagramProfile(accessToken) {
  const url = new URL(
    `https://graph.instagram.com/${config.apiVersion}/me`
  );
  url.searchParams.set("fields", "id,user_id,username,name");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(15000),
  });

  const profile = await response.json();

  if (!response.ok || (!profile?.user_id && !profile?.id)) {
    throw new Error(
      profile?.error?.message || "Failed to fetch Instagram profile"
    );
  }

  return {
    botIgId: String(profile.user_id || profile.id),
    username: profile.username || "",
    name: profile.name || profile.username || "My Business",
  };
}

async function subscribeAccountWebhook(botIgId, accessToken) {
  const url = new URL(
    `https://graph.instagram.com/${config.apiVersion}/${botIgId}/subscribed_apps`
  );
  url.searchParams.set("subscribed_fields", "messages");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json();

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.error?.message || "Failed to subscribe account to webhooks"
    );
  }
}

export async function handleInstagramCallback(code) {
  // 1. Code -> Short-lived token
  const shortToken = await exchangeCodeForShortToken(code);

  // 2. Short-lived -> Long-lived token (60 days)
  const longTokenData = await exchangeForLongLivedToken(shortToken);
  const longToken = longTokenData.access_token;
  const expiresInSec = Number(longTokenData.expires_in) || 60 * 24 * 60 * 60;
  const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000);

  // 3. Profile nikalna (botIgId, username, name)
  const profile = await getOwnInstagramProfile(longToken);

  // 4. Webhook subscribe karna (messages)
  await subscribeAccountWebhook(profile.botIgId, longToken);

  // 5. Encrypted token DB mein save/update karna
  await Account.findOneAndUpdate(
    { botIgId: profile.botIgId },
    {
      $set: {
        username: profile.username,
        accessToken: encrypt(longToken),
        tokenExpiresAt,
      },
      $setOnInsert: {
        botIgId: profile.botIgId,
        "businessInfo.name": profile.name,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

 
  const jwtToken = jwt.sign(
    { botIgId: profile.botIgId },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    token: jwtToken,
    botIgId: profile.botIgId,
    username: profile.username,
  };
}