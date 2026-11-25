// Sabhi providers ke non-chat models (Audio, Image, Video, Embedding, Guard/Safety) ko hatane ke liye
const NON_CHAT_REGEX =
  /embed|embedding|whisper|tts|orpheus|playai|dall-e|imagen|veo|sora|flux|stable-diffusion|midjourney|-image|nano-banana|lyria|genie|moderation|guard|shield|safeguard|audio|transcribe|speech|realtime|-live|translate|aqa|babbage|davinci|computer-use|robotics|deep-research|antigravity|decision/i;

export function filterChatModels(apiResponse) {
  // OpenAI, Groq, OpenRouter, aur Gemini sabhi 'data' array bhejte hain
  const modelsList = Array.isArray(apiResponse)
    ? apiResponse
    : apiResponse?.data || [];

  return modelsList
    .filter((model) => {
      const id = (model.id || model.name || "").toLowerCase();
      if (!id) return false;

      // 1. OpenRouter Special Check: Agar architecture metadata available hai
      // Sirf wahi models rakhein jinka output 'text' hai (image/audio output wale hata dein)
      if (model.architecture?.modality) {
        const outputPart = model.architecture.modality.split("->")[1] || "";
        if (!outputPart.includes("text")) {
          return false;
        }
      }

      // 2. Gemini Native API Check (agar kabhi native endpoint use ho):
      if (
        Array.isArray(model.supportedGenerationMethods) &&
        !model.supportedGenerationMethods.includes("generateContent")
      ) {
        return false;
      }

      // 3. Universal Regex Check (Groq, OpenAI, Gemini, DeepSeek, Custom sabke liye)
      if (NON_CHAT_REGEX.test(id)) {
        return false;
      }

      return true;
    })
    .map((model) => ({
      // Gemini ke 'models/' prefix ko clean karein taaki direct chat API mein use ho sake
      id: (model.id || model.name).replace(/^models\//, ""),
      name: model.name || model.id.replace(/^models\//, ""),
      owned_by: model.owned_by || "provider",
    }))
    // Alphabetical order mein sort karein taaki frontend dropdown clean dikhe
    .sort((a, b) => a.id.localeCompare(b.id));
}
