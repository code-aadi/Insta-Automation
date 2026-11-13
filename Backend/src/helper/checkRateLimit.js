const WINDOW_MS = 60 * 1000; // 1 minute ki window
const MAX_MESSAGES = 8;      // 1 minute mein max 8 messages

const userHits = new Map();  // senderId → { times: [...], warned: false }

export const checkRateLimit = (senderId) => {
  const now = Date.now();

  let record = userHits.get(senderId);
  if (!record) {
    record = { times: [], warned: false };
    userHits.set(senderId, record);
  }

  
  record.times = record.times.filter((t) => now - t < WINDOW_MS);

 
  record.times.push(now);

  const limited = record.times.length > MAX_MESSAGES;

  
  let shouldWarn = false;
  if (limited && !record.warned) {
    record.warned = true;
    shouldWarn = true;
  }
  if (!limited) record.warned = false;

  return { limited, shouldWarn };
};


setInterval(() => {
  const now = Date.now();
  for (const [id, record] of userHits) {
    const last = record.times[record.times.length - 1] ?? 0;
    if (now - last > WINDOW_MS) userHits.delete(id);
  }
}, 5 * 60 * 1000).unref();