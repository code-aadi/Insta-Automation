import { config } from "../config/env.js";
import { decrypt } from "../helper/crypto.js";
import { cleanButtons } from "../models/button.schema.js";
import { Account } from "../models/account.model.js";
import { CommentRule, CommentMedia, CommentEvent } from "../models/comment.model.js";

function cleanKeywords(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    const k = String(raw || "").trim();
    if (!k || seen.has(k.toLowerCase())) continue;
    seen.add(k.toLowerCase());
    out.push(k);
  }
  return out.slice(0, 25);
}

function rulePayload(body, existing = {}) {
  const p = {};
  if (body.name !== undefined) p.name = String(body.name).trim().slice(0, 80);
  if (body.targetMode !== undefined) p.targetMode = body.targetMode === "specific" ? "specific" : "all";
  if (body.mediaIds !== undefined) p.mediaIds = Array.isArray(body.mediaIds) ? body.mediaIds.map(String) : [];
  if (body.matchAll !== undefined) p.matchAll = Boolean(body.matchAll);
  if (body.keywords !== undefined) p.keywords = cleanKeywords(body.keywords);
  if (body.matchType !== undefined) p.matchType = body.matchType === "exact" ? "exact" : "contains";
  if (body.isActive !== undefined) p.isActive = Boolean(body.isActive);
  if (body.privateReply !== undefined) {
    p.privateReply = {
      text: String(body.privateReply?.text || "").slice(0, 640),
      buttons: cleanButtons(body.privateReply?.buttons),
    };
  }
  if (body.followGate !== undefined) {
    p.followGate = {
      text: String(body.followGate?.text || "").slice(0, 640),
      profileUrl: String(body.followGate?.profileUrl || "").trim(),
      confirmPayload: String(body.followGate?.confirmPayload || "I_AM_FOLLOWING").trim().slice(0, 100),
    };
  }
  if (body.reward !== undefined) {
    p.reward = {
      text: String(body.reward?.text || "").slice(0, 640),
      buttons: cleanButtons(body.reward?.buttons),
    };
  }
  return p;
}

function validateRule(p) {
  if (!p.name) return "Rule name is required";
  if (p.targetMode === "specific" && (!p.mediaIds || p.mediaIds.length === 0))
    return "Select at least one post or reel";
  if (!p.matchAll && (!p.keywords || p.keywords.length === 0))
    return "Add a keyword, or turn on 'Any comment'";
  if (!p.privateReply?.text) return "Private reply text is required";
  if (!p.reward?.text) return "Reward message text is required";
  return null;
}

export const listCommentRules = async (req, res) => {
  try {
    const rules = await CommentRule.find({ botIgId: req.botIgId }).sort({ order: 1, createdAt: 1 }).lean();
    return res.json({ rules });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch comment rules" });
  }
};

export const createCommentRule = async (req, res) => {
  try {
    const p = rulePayload(req.body);
    const err = validateRule(p);
    if (err) return res.status(400).json({ error: err });
    const count = await CommentRule.countDocuments({ botIgId: req.botIgId });
    const rule = await CommentRule.create({ ...p, botIgId: req.botIgId, order: count });
    return res.status(201).json({ rule });
  } catch (e) {
    console.error("createCommentRule:", e.message);
    return res.status(400).json({ error: e.message });
  }
};

export const updateCommentRule = async (req, res) => {
  try {
    const existing = await CommentRule.findOne({ _id: req.params.ruleId, botIgId: req.botIgId }).lean();
    if (!existing) return res.status(404).json({ error: "Rule not found" });
    const merged = { ...existing, ...rulePayload(req.body) };
    const err = validateRule(merged);
    if (err) return res.status(400).json({ error: err });
    const rule = await CommentRule.findOneAndUpdate(
      { _id: req.params.ruleId, botIgId: req.botIgId },
      { $set: rulePayload(req.body) },
      { new: true, runValidators: true }
    ).lean();
    return res.json({ rule });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};

export const deleteCommentRule = async (req, res) => {
  try {
    const rule = await CommentRule.findOneAndDelete({ _id: req.params.ruleId, botIgId: req.botIgId }).lean();
    if (!rule) return res.status(404).json({ error: "Rule not found" });
    return res.json({ rule });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};

export const restoreCommentRule = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: "Nothing to restore" });
    const { _id, createdAt, updatedAt, __v, ...rest } = b;
    const rule = await CommentRule.create({ ...rest, botIgId: req.botIgId });
    return res.status(201).json({ rule });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};

export const reorderCommentRules = async (req, res) => {
  try {
    const { ruleIds } = req.body;
    if (!Array.isArray(ruleIds) || ruleIds.length === 0)
      return res.status(400).json({ error: "ruleIds array required" });
    const existing = await CommentRule.find({ botIgId: req.botIgId }).lean();
    if (ruleIds.length !== existing.length || ruleIds.some((id) => !existing.some((r) => String(r._id) === String(id))))
      return res.status(400).json({ error: "Rule list changed — refresh and try again" });
    await Promise.all(
      ruleIds.map((id, i) => CommentRule.updateOne({ _id: id, botIgId: req.botIgId }, { $set: { order: i } }))
    );
    const rules = await CommentRule.find({ botIgId: req.botIgId }).sort({ order: 1 }).lean();
    return res.json({ rules });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};

export const bulkCommentRules = async (req, res) => {
  try {
    const { ruleIds, action } = req.body;
    if (!Array.isArray(ruleIds) || ruleIds.length === 0)
      return res.status(400).json({ error: "ruleIds array required" });
    const filter = { botIgId: req.botIgId, _id: { $in: ruleIds } };
    if (action === "pause") await CommentRule.updateMany(filter, { $set: { isActive: false } });
    else if (action === "activate") await CommentRule.updateMany(filter, { $set: { isActive: true } });
    else if (action === "delete") await CommentRule.deleteMany(filter);
    else return res.status(400).json({ error: "Unknown action" });
    const rules = await CommentRule.find({ botIgId: req.botIgId }).sort({ order: 1 }).lean();
    return res.json({ rules });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};

export const listCommentMedia = async (req, res) => {
  try {
    const media = await CommentMedia.find({ botIgId: req.botIgId }).sort({ postedAt: -1 }).lean();
    return res.json({ media });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch media" });
  }
};

export const syncCommentMedia = async (req, res) => {
  try {
    const account = await Account.findOne({ botIgId: req.botIgId }).select("+accessToken username").lean();
    if (!account) return res.status(404).json({ error: "Account not found" });

    const url = new URL(`https://graph.instagram.com/${config.apiVersion}/${req.botIgId}/media`);
    url.searchParams.set(
      "fields",
      "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count,like_count"
    );
    url.searchParams.set("limit", "50");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${decrypt(account.accessToken)}` },
      signal: AbortSignal.timeout(20000),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      return res.status(400).json({ error: `Instagram ne invalid response bheja (HTTP ${response.status})` });
    }
    if (!response.ok) {
      return res.status(400).json({ error: data?.error?.message || "Media sync failed" });
    }

    const items = Array.isArray(data?.data) ? data.data : [];
    await Promise.all(
      items.map((m) =>
        CommentMedia.updateOne(
          { botIgId: req.botIgId, mediaId: String(m.id) },
          {
            $set: {
              mediaType: m.media_type || "IMAGE",
              caption: m.caption || "",
              thumbnailUrl: m.thumbnail_url || m.media_url || "",
              permalink: m.permalink || "",
              commentsCount: m.comments_count ?? 0,
              likeCount: m.like_count ?? 0,
              postedAt: m.timestamp ? new Date(m.timestamp) : null,
              syncedAt: new Date(),
            },
          },
          { upsert: true }
        )
      )
    );

    const media = await CommentMedia.find({ botIgId: req.botIgId }).sort({ postedAt: -1 }).lean();
    return res.json({ media, synced: items.length });
  } catch (e) {
    console.error("syncCommentMedia:", e.message);
    return res.status(400).json({ error: e.message });
  }
};

export const listCommentActivity = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    const filter = { botIgId: req.botIgId };
    if (req.query.stage && req.query.stage !== "all") filter.stage = req.query.stage;
    const [events, total, counts] = await Promise.all([
      CommentEvent.find(filter).sort({ timestamp: -1 }).limit(limit).lean(),
      CommentEvent.countDocuments({ botIgId: req.botIgId }),
      CommentEvent.aggregate([
        { $match: { botIgId: req.botIgId } },
        { $group: { _id: "$stage", n: { $sum: 1 } } },
      ]),
    ]);
    const byStage = {};
    for (const c of counts) byStage[c._id] = c.n;
    return res.json({ events, total, byStage });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch activity" });
  }
};