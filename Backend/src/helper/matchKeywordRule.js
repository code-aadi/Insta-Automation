function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isKeywordMatch(normalizedText, rawKeyword, matchType) {
  const keyword = rawKeyword?.trim().toLowerCase();
  if (!keyword) return false;

  if (matchType === "exact") {
    return normalizedText === keyword;
  }

  // "contains" mode:
  // Agar keyword normal letters/numbers se shuru aur khatam hota hai, toh word-boundary (\b) check karo
  // Taaki "art" keyword "party" mein match na ho, par "price?" ya "price!" match ho jaye
  if (/^[a-z0-9].*[a-z0-9]$|^[a-z0-9]$/i.test(keyword)) {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
    return regex.test(normalizedText);
  }

  // Emojis ya special symbols ke liye simple includes
  return normalizedText.includes(keyword);
}

export function matchKeywordRule(incomingText, rules = []) {
  if (!incomingText || !Array.isArray(rules) || rules.length === 0) {
    return null;
  }

  const normalizedText = incomingText.trim().toLowerCase();
  if (!normalizedText) return null;

  for (const rule of rules) {
    if (rule.isActive === false) continue;
    if (!Array.isArray(rule.keywords)) continue;

    for (const keyword of rule.keywords) {
      if (isKeywordMatch(normalizedText, keyword, rule.matchType)) {
        return rule;
      }
    }
  }

  return null;
}