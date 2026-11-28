import { Account } from "../models/account.model.js";
import { User } from "../models/user.model.js";
import { CommentRule, CommentEvent } from "../models/comment.model.js";
import { decrypt } from "../helper/crypto.js";
import { matchKeywordRule } from "../helper/matchKeywordRule.js";
import {
  sendPrivateReply,
  sendInstagramButtons,
  sendInstagramMessage,
  getInstagramProfile,
} from "./instagram.service.js";

const ACCESS_PREFIX = "CMT:";

function findMatchingRule(rules, text, mediaId) {
  const scoped = rules.filter(
    (r) =>
      r.isActive !== false &&
      (r.targetMode === "all" || (r.mediaIds || []).map(String).includes(String(mediaId)))
  );
  for (const rule of scoped) {
    if (rule.matchAll) return rule;
    if (matchKeywordRule(text, [rule])) return rule;
  }
  return null;
}

async function loadAccount(botIgId) {
  const account = await Account.findOne({ botIgId })
    .select("+accessToken username settings.isActive")
    .lean();
  if (!account || !account.settings?.isActive) return null;
  return account;
}

// ---------- STAGE 1: comment aaya -> one-shot private reply ----------
export async function handleCommentEvent(botIgId, value, timestamp) {
  const commentId = String(value?.id || "");
  const fromId = String(value?.from?.id || "");
  const fromUsername = value?.from?.username || "";
  const mediaId = String(value?.media?.id || "");
  const text = String(value?.text || "");

  if (!commentId || !fromId || fromId === String(botIgId)) return;

  const account = await loadAccount(botIgId);
  if (!account) return;

  const rules = await CommentRule.find({ botIgId }).sort({ order: 1, createdAt: 1 }).lean();
  const rule = findMatchingRule(rules, text, mediaId);
  if (!rule) return;

  let event;
  try {
    event = await CommentEvent.create({
      botIgId, commentId, mediaId,
      ruleId: String(rule._id), ruleName: rule.name,
      fromId, fromUsername, text,
      stage: "matched",
      timestamp: new Date(timestamp || Date.now()),
    });
  } catch (error) {
    if (error.code === 11000) return; // Meta retry
    console.error("[Comment] store error:", error.message);
    return;
  }

  await CommentRule.updateOne({ _id: rule._id }, { $inc: { "stats.matched": 1 } });

  const credentials = { botIgId, accessToken: decrypt(account.accessToken) };

  const rawButtons = rule.privateReply?.buttons?.length
    ? rule.privateReply.buttons
    : [{ type: "postback", title: "Send me access", payload: "SEND_ACCESS" }];

  // Postback ko namespace karo taaki DM buttons se mix na ho
  const buttons = rawButtons.map((b) =>
    b.type === "postback" ? { ...b, payload: `${ACCESS_PREFIX}${rule._id}:access` } : b
  );

  try {
    await sendPrivateReply(credentials, commentId, rule.privateReply.text, buttons);
    await CommentEvent.updateOne(
      { _id: event._id },
      { $set: { stage: "private_replied", privateReplyAt: new Date() } }
    );
    await CommentRule.updateOne({ _id: rule._id }, { $inc: { "stats.replied": 1 } });
    console.log(`[Comment] Private reply → @${fromUsername || fromId} · ${rule.name}`);
  } catch (error) {
    await CommentEvent.updateOne({ _id: event._id }, { $set: { stage: "failed" } });
    console.error("[Comment] private reply failed:", error.message);
  }
}

// ---------- STAGE 2/3: button tap -> follow check -> reward ya gate ----------
export async function handleCommentPostback(botIgId, userId, payload) {
  const ruleId = String(payload || "").split(":")[1];
  if (!ruleId) return;

  const account = await loadAccount(botIgId);
  if (!account) return;

  const rule = await CommentRule.findOne({ _id: ruleId, botIgId }).lean();
  if (!rule) return;

  const event = await CommentEvent.findOne({ botIgId, fromId: userId, ruleId })
    .sort({ timestamp: -1 })
    .lean();

  const credentials = { botIgId, accessToken: decrypt(account.accessToken) };

  let profile = null;
  try {
    profile = await getInstagramProfile(credentials, userId);
    await User.findOneAndUpdate(
      { botIgId, instagramId: userId },
      { $set: { ...profile, lastMessageAt: new Date() }, $setOnInsert: { firstMessageAt: new Date() } },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (error) {
    console.error("[Comment] profile fetch:", error.message);
  }

  // ---- FOLLOWING: reward link bhejo ----
  if (profile?.isFollowing) {
    const buttons = rule.reward?.buttons || [];
    try {
      if (buttons.length) {
        await sendInstagramButtons(credentials, userId, rule.reward.text, buttons);
      } else {
        await sendInstagramMessage(credentials, userId, rule.reward.text);
      }
      if (event) {
        await CommentEvent.updateOne(
          { _id: event._id },
          { $set: { stage: "delivered", confirmAt: new Date(), deliveredAt: new Date() } }
        );
      }
      await CommentRule.updateOne({ _id: rule._id }, { $inc: { "stats.delivered": 1 } });
      console.log(`[Comment] ✅ Reward delivered → ${userId} · ${rule.name}`);
    } catch (error) {
      console.error("[Comment] reward send failed:", error.message);
    }
    return;
  }

  // ---- NOT FOLLOWING: 2-button gate template ----
  const profileUrl =
    rule.followGate?.profileUrl ||
    (account.username ? `https://www.instagram.com/${account.username}/` : "");

  const gateButtons = [
    { type: "web_url", title: "Follow Karo ❤️", url: profileUrl },
    { type: "postback", title: "I am following", payload: `${ACCESS_PREFIX}${rule._id}:follow` },
  ];

  try {
    await sendInstagramButtons(credentials, userId, rule.followGate.text, gateButtons);
    if (event) {
      await CommentEvent.updateOne(
        { _id: event._id },
        { $set: { stage: "awaiting_follow", confirmAt: new Date() }, $inc: { denyCount: 1 } }
      );
    }
    console.log(`[Comment] ⛔ Not following → gate sent · ${userId}`);
  } catch (error) {
    console.error("[Comment] gate send failed:", error.message);
  }
}

export const isCommentPayload = (payload) => String(payload || "").startsWith(ACCESS_PREFIX);