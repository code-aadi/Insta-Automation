import {
  sendInstagramMessage,
  sendTypingIndicator,
  getInstagramProfile,
} from "./instagram.service.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { Account } from "../models/account.model.js";
import { retryDatabaseUpdate } from "../helper/retry.js";
import { getConversationHistory } from "./conversation.service.js";
import { getReply } from "./ai.service.js";
import { generateConversationId } from "../helper/conversationId.js";
import { scheduleReply } from "../helper/scheduleReply.js";
import { checkRateLimit } from "../helper/checkRateLimit.js";
import { decrypt } from "../helper/crypto.js";
import { matchKeywordRule } from "../helper/matchKeywordRule.js";

export async function handleIncomingMessage(
  botIgId,
  senderId,
  incomingMessage,
  messageId,
  messageTimeStamp
) {
  // Check karo ki client DB mein hai aur uska bot active hai
  const account = await Account.findOne({ botIgId })
    .select("+accessToken settings.isActive settings.replyDelaySeconds")
    .lean();

  if (!account || !account.settings?.isActive) {
    return;
  }

  const conversationId = generateConversationId(senderId, botIgId);

  // Incoming message DB mein save karo
  try {
    await Message.create({
      botIgId,
      conversationId,
      senderId,
      recipientId: botIgId,
      messageId,
      direction: "incoming",
      text: incomingMessage,
      messageType: "text",
      status: "received",
      timestamp: new Date(messageTimeStamp),
    });
  } catch (error) {
    if (error.code === 11000) return;
    console.error("Error in storing message:", error.message);
    return;
  }

  // Per-client + per-user unique key
  const key = `${botIgId}_${senderId}`;
  const { limited, shouldWarn } = checkRateLimit(key);

  if (limited) {
    if (shouldWarn) {
      try {
        const credentials = {
          botIgId,
          accessToken: decrypt(account.accessToken),
        };
        await sendInstagramMessage(
          credentials,
          senderId,
          "Arre arre, thoda dheere bhai! 😄 Ek-ek karke bolo, main kahin nahi ja raha."
        );
      } catch (error) {
        console.error("Rate limit warning error:", error.message);
      }
    }
    return;
  }

const delaySeconds = account.settings?.replyDelaySeconds ?? 3;
  scheduleReply(key, () => processReply(botIgId, senderId, conversationId), delaySeconds);
}

function getLatestIncomingText(history = []) {
  const texts = [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].direction === "incoming" && history[i].text) {
      texts.unshift(history[i].text);
    } else {
      break;
    }
  }
  return texts.join(" ");
}

async function processReply(botIgId, senderId, conversationId) {
  let credentials;
  let typingOn = false;

  try {
    // Client ki config + encrypted accessToken + AI provider keys fetch karo
    const account = await Account.findOne({ botIgId })
      .select("+accessToken +aiProviders.apiKey")
      .lean();

    if (!account || !account.settings?.isActive) return;

    credentials = {
      botIgId,
      accessToken: decrypt(account.accessToken),
    };

    // Chat history fetch karo
    let history = [];
    try {
      history = await getConversationHistory(senderId, botIgId);
    } catch (error) {
      console.error("Error in getting conversation history:", error.message);
    }

    // User profile + Follow Gate check
    let userDetails;
    try {
      const instaProfile = await getInstagramProfile(credentials, senderId);

      userDetails = await User.findOneAndUpdate(
        { botIgId, instagramId: senderId },
        {
          $set: { ...instaProfile, lastMessageAt: new Date() },
          $setOnInsert: {
            firstMessageAt: new Date(),
            botIgId,
            instagramId: senderId,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      if (account.settings?.requireFollow && !instaProfile.isFollowing) {
        const followMsg =
          account.settings.followMessage ||
          "Please follow first then we talk! 😊";
        await sendInstagramMessage(credentials, senderId, followMsg);
        return;
      }
    } catch (error) {
      console.error("Profile error:", error.message);
    }

    // Reply decide karo (Rules / AI / Hybrid)
    const botMode = account.settings?.botMode || "hybrid";
    const latestText = getLatestIncomingText(history);
    let reply = null;
    let replySource = "rule";
    let aiMeta = undefined;

    if (botMode === "rules" || botMode === "hybrid") {
      reply = matchKeywordRule(latestText, account.keywordRules);
    }

    if (!reply) {
      if (botMode === "rules") {
        const noMatchReply = account.settings?.noMatchReply?.trim();
        if (!noMatchReply) return; // Bina typing_on kiye chupchap exit
        reply = noMatchReply;
        replySource = "fallback";
      } else {
        // Ab AI reply banne wala hai -> sirf ab typing_on bhejo!
        try {
          await sendTypingIndicator(credentials, senderId, "typing_on");
          typingOn = true;
        } catch (error) {
          console.error("Typing ON Error:", error.message);
        }

        const filteredUserDetails = {
          name: userDetails?.name || userDetails?.username || "friend",
          username: userDetails?.username,
        };

        const aiProviders = (account.aiProviders || [])
          .filter((p) => p.isActive !== false && p.apiKey)
          .map((p) => {
            try {
              return { ...p, apiKey: decrypt(p.apiKey) };
            } catch (err) {
              console.error("Provider API key decrypt error:", err.message);
              return null;
            }
          })
          .filter(Boolean);

        try {
          const aiResult = await getReply({
            userDetails: filteredUserDetails,
            businessInfo: account.businessInfo,
            history,
            aiProviders,
            fallbackMessage: account.settings?.fallbackMessage,
          });

          reply = aiResult.text;
          if (aiResult.isFallback) {
            replySource = "fallback";
          } else {
            replySource = "ai";
            aiMeta = {
              model: aiResult.modelUsed,
              promptTokens: aiResult.usage?.promptTokens || 0,
              completionTokens: aiResult.usage?.completionTokens || 0,
              totalTokens: aiResult.usage?.totalTokens || 0,
            };
          }
        } catch (error) {
          console.error("AI reply error:", error);
          reply =
            account.settings?.fallbackMessage ||
            "Abhi ispe thoda kaam chal rha hai. Thodi der baad try karna.";
          replySource = "fallback";
        }
      }
    }

    // Outgoing message DB mein save karo
    let outgoingMessage;
    try {
      outgoingMessage = await Message.create({
        botIgId,
        conversationId,
        senderId: botIgId,
        recipientId: senderId,
        text: reply,
        direction: "outgoing",
        status: "pending",
        messageType: "text",
        replySource,
        ...(aiMeta ? { aiMeta } : {}),
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error storing outgoing message:", error.message);
      return;
    }

    // Instagram par reply bhejo
    let upcomingData;
    try {
      upcomingData = await sendInstagramMessage(credentials, senderId, reply);
    } catch (error) {
      const finalStatus = error.deliveryStatus || "unknown";
      const updated = await retryDatabaseUpdate(() =>
        Message.findByIdAndUpdate(
          outgoingMessage._id,
          { $set: { status: finalStatus } },
          { runValidators: true }
        )
      );
      if (!updated) {
        console.error("Could not update outgoing message status after retries.");
      }
      console.error("Instagram sending error:", error.message);
      return;
    }

    // Status update karo
    const updateData = { status: "sent" };
    if (upcomingData.message_id) updateData.messageId = upcomingData.message_id;

    const updated = await retryDatabaseUpdate(() =>
      Message.findByIdAndUpdate(
        outgoingMessage._id,
        { $set: updateData },
        { runValidators: true }
      )
    );
    if (!updated) {
      console.error(
        "Instagram message sent, but MongoDB update failed after retries."
      );
    }
  } catch (error) {
    console.error("Message Service Error:", error);
  } finally {
    if (typingOn && credentials) {
      try {
        await sendTypingIndicator(credentials, senderId, "typing_off");
      } catch (error) {
        console.error("Typing OFF Error:", error.message);
      }
    }
  }
}

const MEDIA_COOLDOWN_MS = 30 * 1000;
const lastMediaReply = new Map();

const MEDIA_REPLIES = {
  audio: "Voice message sunna abhi seekh raha hu 😅 Text mein likh do, turant jawab dunga!",
  video: "Video dekhne ki powers abhi nahi mili 😄 Text mein bol do, main yahin hu!",
  image: "Photo toh mast lag rahi hogi, par mujhe abhi sirf text samajh aata hai 😎 Likh ke batao!",
  default: "Ye wala format mere sar ke upar se gaya 😅 Text mein likho, main ready hu!",
};

export async function handleMediaMessage(botIgId, senderId, mediaType) {
  const key = `${botIgId}_${senderId}`;
  const last = lastMediaReply.get(key) || 0;
  if (Date.now() - last < MEDIA_COOLDOWN_MS) return;

  const account = await Account.findOne({ botIgId })
    .select("+accessToken settings.isActive")
    .lean();

  if (!account || !account.settings?.isActive) return;

  lastMediaReply.set(key, Date.now());
  setTimeout(() => lastMediaReply.delete(key), MEDIA_COOLDOWN_MS).unref();

  const credentials = {
    botIgId,
    accessToken: decrypt(account.accessToken),
  };

  const reply = MEDIA_REPLIES[mediaType] || MEDIA_REPLIES.default;
  await sendInstagramMessage(credentials, senderId, reply);
}