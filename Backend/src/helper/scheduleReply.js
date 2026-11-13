
const DEBOUNCE_MS = 2500;      // aakhri message ke itne ms baad reply
const userStates = new Map();  // diary: senderId → us user ka page

export const scheduleReply = (senderId, task) => {
  // 1. Is user ka page nikalo, na ho to naya banao
  let state = userStates.get(senderId);
  if (!state) {
    state = { timer: null, isRunning: false, hasNewMessage: false };
    userStates.set(senderId, state);
  }

  // 2. Kaam chal raha hai? To naya alarm nahi, sirf chitthi chhodo
  if (state.isRunning) {
    state.hasNewMessage = true;
    return;
  }

  // 3. Purana alarm cancel karo, naya lagao (debounce)
  clearTimeout(state.timer);
  state.timer = setTimeout(() => runTask(senderId, task), DEBOUNCE_MS);
};

const runTask = async (senderId, task) => {
  const state = userStates.get(senderId);
  if (!state) return;

  state.isRunning = true;
  state.hasNewMessage = false;

  try {
    await task(); // reply banao aur bhejo, jab tak khatam na ho yahin ruko
  } catch (error) {
    console.error("[Queue] task failed:", error.message);
  } finally {
    state.isRunning = false;

    if (state.hasNewMessage) {
      // kaam ke dauraan naya message aaya tha: ek aur round
      state.hasNewMessage = false;
      state.timer = setTimeout(() => runTask(senderId, task), DEBOUNCE_MS);
    } else {
      userStates.delete(senderId); // memory saaf
    }
  }
};