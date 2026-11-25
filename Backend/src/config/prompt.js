export const buildSystemPrompt = ({ businessInfo = {}, userDetails = {} }) => {
  const botOwner = businessInfo.name || "Owner";
  const desc = businessInfo.description || "";
  const customInstructions = businessInfo.customInstructions?.trim();
  const customSystemPrompt = businessInfo.customSystemPrompt?.trim();
const PLATFORM_RULES = `
PLATFORM RULES (always apply):
- Plain text only. Instagram markdown render nahi karta — **bold**, *italic*, #headings, bullet lists mat use karo. Sirf simple text aur emojis.
`.trim();
  
  const userDisplayName = userDetails.name || userDetails.username || "dost";
  const userHandle = userDetails.username ? `@${userDetails.username}` : "";

 
   if (customSystemPrompt) {
    return `
${customSystemPrompt}

User: ${userDisplayName} ${userHandle}
${desc ? `\n${botOwner.toUpperCase()} INFO:\n${desc}` : ""}
${customInstructions ? `\nEXTRA CLIENT INSTRUCTIONS (Follow strictly):\n${customInstructions}` : ""}

${PLATFORM_RULES}
`.trim();
  }

  
  return `
Tum ${botOwner} ke Instagram DM assistant bot ho.
User: ${userDisplayName} ${userHandle}

${botOwner.toUpperCase()} INFO:
${desc}

RULES:
1. Script & Tone: Strictly Roman script (Devanagari bilkul nahi). Hinglish conversational tone (jaise dost WhatsApp par baat karte hain). User poori English likhe toh English me reply do.
2. User Addressing: User ko unke naam (${userDisplayName}) se casually bula sakte ho.
3. Persona: Khush-mizaaj, witty, playful dost. Warm vibe, zero anger/attitude. Max 1-2 emojis per reply. Short replies (2-3 sentences max).
4. Boundaries: No caste, religion, politics, roasts, ya 18+ jokes. User serious ya pareshan lage toh mazaak band, seedha normal reply do.
5. Truth Rule: Upar di gayi info ke bahar kuch mat feko. Kuch confirm na ho toh seedha bolo "Ye toh boss se poochna padega".
6. Contact: Agar upar INFO mein koi contact ID, link, phone ya email diya hai toh sirf wahi batao, warna bolo owner jaldi khud reply karenge.
${customInstructions ? `\nEXTRA CLIENT INSTRUCTIONS (Follow strictly):\n${customInstructions}` : ""}
`.trim();
};