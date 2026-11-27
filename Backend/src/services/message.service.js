import {
  sendInstagramMessage,
  sendInstagramButtons,
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
  const account = await Account.findOne({ botIgId })
    .select("+accessToken settings.isActive settings.replyDelaySeconds")
    .lean();

  if (!account) return;

  const conversationId = generateConversationId(senderId, botIgId);
  const messageDate = new Date(messageTimeStamp || Date.now());

  // 1. Incoming message HAMESHA save (bot paused ho tab bhi)
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
      timestamp: messageDate,
    });
  } catch (error) {
    if (error.code === 11000) return; // Meta duplicate event
    console.error("Error in storing message:", error.message);
    return;
  }

  let accessToken;
  try {
    accessToken = decrypt(account.accessToken);
  } catch (error) {
    console.error("Token decrypt error:", error.message);
  }

  // 2. Lead ensure (naya ho toh profile bhi)
  await ensureLead(botIgId, senderId, messageDate, accessToken);

  // 3. Bot paused -> record ho gaya, ab reply nahi
  if (!account.settings?.isActive) return;

  // 4. Rate limit
  const key = `${botIgId}_${senderId}`;
  const { limited, shouldWarn } = checkRateLimit(key);

  if (limited) {
    if (shouldWarn) {
      await sendSystemMessage(
        { botIgId, accessToken },
        senderId,
        conversationId,
        "Arre arre, thoda dheere bhai! 😄 Ek-ek karke bolo, main kahin nahi ja raha."
      );
    }
    return;
  }

  // 5. Debounce + reply queue
  const delaySeconds = account.settings?.replyDelaySeconds ?? 3;
  scheduleReply(
    key,
    () => processReply(botIgId, senderId, conversationId),
    delaySeconds
  );
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
/**
 * Lead ensure karta hai. Naya lead ho toh profile bhi fetch kar leta hai,
 * taaki bot paused hone par bhi inbox mein naam/username dikhe.
 */
async function ensureLead(botIgId, senderId, messageDate, accessToken) {
  let isNewLead = false;

  try {
    const existing = await User.findOne({ botIgId, instagramId: senderId })
      .select("_id")
      .lean();
    isNewLead = !existing;

    await User.findOneAndUpdate(
      { botIgId, instagramId: senderId },
      {
        $set: { lastMessageAt: messageDate },
        $setOnInsert: { firstMessageAt: messageDate },
      },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (error) {
    console.error("Lead upsert error:", error.message);
    return;
  }

  if (!isNewLead) return;

  try {
    const instaProfile = await getInstagramProfile(
      { botIgId, accessToken },
      senderId
    );
    await User.updateOne(
      { botIgId, instagramId: senderId },
      { $set: instaProfile }
    );
  } catch (error) {
    console.error("New lead profile fetch error:", error.message);
  }
}


async function sendSystemMessage(credentials, senderId, conversationId, text, buttons = []) {
  const { botIgId } = credentials;

  let doc;
  try {
    doc = await Message.create({
      botIgId,
      conversationId,
      senderId: botIgId,
      recipientId: senderId,
      text,
      direction: "outgoing",
      messageType: "text",
      status: "pending",
      replySource: "system",
      ...(buttons.length ? { buttons } : {}),
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("System message store error:", error.message);
    return false;
  }

  let sentData;
  try {
    sentData = buttons.length
      ? await sendInstagramButtons(credentials, senderId, text, buttons)
      : await sendInstagramMessage(credentials, senderId, text);
  } catch (error) {
    await retryDatabaseUpdate(() =>
      Message.findByIdAndUpdate(doc._id, {
        $set: { status: error.deliveryStatus || "unknown" },
      })
    );
    console.error("System message send error:", error.message);
    return false;
  }

  await retryDatabaseUpdate(() =>
    Message.findByIdAndUpdate(doc._id, {
      $set: {
        status: "sent",
        ...(sentData.message_id ? { messageId: sentData.message_id } : {}),
      },
    })
  );

  return true;
}

/**
 * Profile fetch + lead update. API fail ho toh DB ka cached data return karta hai.
 */
async function refreshLeadProfile(botIgId, senderId, accessToken) {
  try {
    const instaProfile = await getInstagramProfile(
      { botIgId, accessToken },
      senderId
    );
    return await User.findOneAndUpdate(
      { botIgId, instagramId: senderId },
      { $set: { ...instaProfile } },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (error) {
    console.error("Profile error:", error.message);
    return await User.findOne({ botIgId, instagramId: senderId }).lean();
  }
}

/**
 * FOLLOW GATE — shared by processReply aur handleMediaMessage.
 * return true  = gate band, aage koi reply NAHI bhejna
 * return false = gate pass, normal reply bhejo
 */
async function checkFollowGate({
  account,
  credentials,
  senderId,
  conversationId,
  userDetails,
}) {
  if (!account.settings?.requireFollow) return false;
  if (!userDetails) return false; // koi data nahi -> reply allow
  if (userDetails.isFollowing) return false; // follower -> allow

  const { botIgId } = credentials;

  const cooldownHours = account.settings?.followReminderCooldownHours ?? 24;
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const lastSent = userDetails.lastFollowReminderAt
    ? new Date(userDetails.lastFollowReminderAt).getTime()
    : 0;

  // Cooldown chal raha hai -> chup raho, par gate band hi rahega
  if (Date.now() - lastSent < cooldownMs) return true;

  const followMsg =
    account.settings.followMessage || "Please follow first then we talk! 😊";

    // Custom buttons nahi hain -> ek-tap Follow button auto bana do
  const followButtons = account.settings?.followButtons?.length
    ? account.settings.followButtons
    : account.username
      ? [
          {
            type: "web_url",
            title: "Follow Us",
            url: `https://www.instagram.com/${account.username}/`,
          },
        ]
      : [];

  const sent = await sendSystemMessage(
    credentials,
    senderId,
    conversationId,
    followMsg,
    followButtons
  );

  // Cooldown timer sirf successful send par start
  if (sent) {
    try {
      await User.updateOne(
        { botIgId, instagramId: senderId },
        { $set: { lastFollowReminderAt: new Date() } }
      );
    } catch (error) {
      console.error("Follow cooldown update error:", error.message);
    }
  }

  return true; // send fail ho toh bhi gate band (fail-open fix)
}

async function processReply(botIgId, senderId, conversationId) {
  let credentials;
  let typingOn = false;

  try {
    // ---------- 1. Client config fetch ----------
    const account = await Account.findOne({ botIgId })
      .select("+accessToken +aiProviders.apiKey")
      .lean();

    if (!account || !account.settings?.isActive) return;

    credentials = {
      botIgId,
      accessToken: decrypt(account.accessToken),
    };

    // ---------- 2. Chat history ----------
    let history = [];
    try {
      history = await getConversationHistory(senderId, botIgId);
    } catch (error) {
      console.error("Error in getting conversation history:", error.message);
    }

       // ---------- 3. User profile + FOLLOW GATE ----------
    const userDetails = await refreshLeadProfile(
      botIgId,
      senderId,
      credentials.accessToken
    );

    const blocked = await checkFollowGate({
      account,
      credentials,
      senderId,
      conversationId,
      userDetails,
    });
    if (blocked) return;

    // ---------- 5. Reply decide (Rules / AI / Hybrid) ----------
    
    const botMode = account.settings?.botMode || "hybrid";
    const latestText = getLatestIncomingText(history);

        let reply = null;
    let replySource = "rule";
    let aiMeta = undefined;
    let matchedRule = null;

    if (botMode === "rules" || botMode === "hybrid") {
      matchedRule = matchKeywordRule(latestText, account.keywordRules);
      reply = matchedRule?.reply || null;
    }

    if (!reply) {
      if (botMode === "rules") {
        const noMatchReply = account.settings?.noMatchReply?.trim();
        if (!noMatchReply) return; // chupchap exit
        reply = noMatchReply;
        replySource = "fallback";
      } else {
        // AI reply banne wala hai -> ab typing_on bhejo
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

       // ---------- 6. Outgoing message DB mein save (pending) ----------
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
        ...(matchedRule?.buttons?.length ? { buttons: matchedRule.buttons } : {}),
        ...(aiMeta ? { aiMeta } : {}),
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error storing outgoing message:", error.message);
      return;
    }

      // ---------- 7. Instagram par reply bhejo ----------
    let upcomingData;
    try {
      upcomingData = matchedRule?.buttons?.length
        ? await sendInstagramButtons(credentials, senderId, reply, matchedRule.buttons)
        : await sendInstagramMessage(credentials, senderId, reply);
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

    // ---------- 8. Status update ----------
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
  ig_reel: "Reel dekh nahi sakta abhi 😅 Batao kya chahiye, text mein likh do!",
  reel: "Reel dekh nahi sakta abhi 😅 Batao kya chahiye, text mein likh do!",
  share: "Post share kiya hai na? Main dekh nahi sakta 😄 Text mein bata do kya chahiye!",
  story_mention: "Story mein mention ke liye thanks yaar! 🙌 Kuch chahiye toh text mein likh do.",
  file: "File kholna abhi nahi aata mujhe 😅 Text mein likh do, main ready hu!",
  default: "Ye wala format mere sar ke upar se gaya 😅 Text mein likho, main ready hu!",
};

export async function handleMediaMessage(
  botIgId,
  senderId,
  mediaType,
  messageId,
  messageTimeStamp
) {
  const account = await Account.findOne({ botIgId })
    .select("+accessToken settings")
    .lean();

  if (!account) return;

  const conversationId = generateConversationId(senderId, botIgId);
  const messageDate = new Date(messageTimeStamp || Date.now());
  const type = mediaType || "default";

  // 1. Incoming media HAMESHA save (messageId se dedupe)
  try {
    await Message.create({
      botIgId,
      conversationId,
      senderId,
      recipientId: botIgId,
      messageId,
      direction: "incoming",
      text: "",
      messageType: type,
      status: "received",
      timestamp: messageDate,
    });
  } catch (error) {
    if (error.code === 11000) return;
    console.error("Error storing media message:", error.message);
    return;
  }

  let accessToken;
  try {
    accessToken = decrypt(account.accessToken);
  } catch (error) {
    console.error("Token decrypt error:", error.message);
  }

  const credentials = { botIgId, accessToken };

  // 2. Lead ensure — photo bhejne wala bhi inbox mein aayega
  await ensureLead(botIgId, senderId, messageDate, accessToken);

  // 3. Bot paused -> record ho gaya, reply nahi
  if (!account.settings?.isActive) return;

  // 4. Media reply cooldown (30 sec, per user)
  const key = `${botIgId}_${senderId}`;
  const last = lastMediaReply.get(key) || 0;
  if (Date.now() - last < MEDIA_COOLDOWN_MS) return;

  lastMediaReply.set(key, Date.now());
  setTimeout(() => lastMediaReply.delete(key), MEDIA_COOLDOWN_MS).unref();

  // 5. FOLLOW GATE — ab media par bhi lagega
  let userDetails = await User.findOne({ botIgId, instagramId: senderId }).lean();
  if (account.settings?.requireFollow) {
    // Fresh status lo, taaki abhi-abhi follow karne wala galat block na ho
    userDetails = await refreshLeadProfile(botIgId, senderId, accessToken);
  }

  const blocked = await checkFollowGate({
    account,
    credentials,
    senderId,
    conversationId,
    userDetails,
  });
  if (blocked) return;

  // 6. Media reply bhejo + transcript mein save
  const reply = MEDIA_REPLIES[type] || MEDIA_REPLIES.default;
  await sendSystemMessage(credentials, senderId, conversationId, reply);
}


/**
 * Echo event = bot account se bheja gaya message.
 * - Bot ke apne replies already DB mein hain -> dedupe se skip
 * - Owner ke manual replies (Instagram app se) naye mid ke saath aate hain -> save
 */
export async function handleEchoMessage(
  botIgId,
  userId,
  message,
  messageId,
  messageTimeStamp
) {
  const account = await Account.findOne({ botIgId }).select("_id").lean();
  if (!account) return;

  const text = message?.text || "";
  const attachmentType = message?.attachments?.[0]?.type;

  // Deleted/read jaise events mein kuch record karne layak nahi
  if (!text && !attachmentType) return;

  const conversationId = generateConversationId(userId, botIgId);
  const messageDate = new Date(messageTimeStamp || Date.now());

  // Safety net: agar echo ka mid aur send-API ka message_id alag format nikle,
  // tab bhi apne bot ka reply do baar save na ho
  if (text) {
    const recent = await Message.findOne({
      conversationId,
      direction: "outgoing",
      text,
      timestamp: { $gte: new Date(messageDate.getTime() - 60 * 1000) },
    })
      .select("_id")
      .lean();
    if (recent) return;
  }

  try {
    await Message.create({
      botIgId,
      conversationId,
      senderId: botIgId,
      recipientId: userId,
      messageId,
      text,
      direction: "outgoing",
      messageType: attachmentType || "text",
      status: "sent",
      replySource: "manual",
      timestamp: messageDate,
    });
  } catch (error) {
    if (error.code === 11000) return; // bot ka apna reply, pehle se recorded
    console.error("Echo message store error:", error.message);
    return;
  }

  // Lead ko inbox mein top par le aao
  try {
    await User.findOneAndUpdate(
      { botIgId, instagramId: userId },
      {
        $set: { lastMessageAt: messageDate },
        $setOnInsert: { firstMessageAt: messageDate },
      },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (error) {
    console.error("Echo lead update error:", error.message);
  }

  console.log("[Echo] Manual reply recorded");
}