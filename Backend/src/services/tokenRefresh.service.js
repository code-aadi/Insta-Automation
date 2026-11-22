import { Account } from "../models/account.model.js";
import { refreshAccountToken } from "./auth.service.js";

const REFRESH_THRESHOLD_DAYS = 10;          // expiry se 10 din pehle refresh
const JOB_INTERVAL_MS = 12 * 60 * 60 * 1000; // har 12 ghante check

async function runTokenRefreshSweep() {
  try {
    const cutoff = new Date(
      Date.now() + REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
    );

    const accounts = await Account.find({
      tokenExpiresAt: { $ne: null, $lt: cutoff },
    })
      .select("botIgId username tokenExpiresAt")
      .lean();

    if (accounts.length === 0) return;

    console.log(`[TokenRefresh] ${accounts.length} account(s) need refresh`);

    for (const acc of accounts) {
      try {
        const { tokenExpiresAt } = await refreshAccountToken(acc.botIgId);
        console.log(
          `[TokenRefresh] @${acc.username || acc.botIgId} refreshed → valid till ${
            tokenExpiresAt.toISOString().slice(0, 10)
          }`
        );
      } catch (error) {
        // Ek account fail ho toh baaki chalte rahen
        console.error(
          `[TokenRefresh] @${acc.username || acc.botIgId} failed:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("[TokenRefresh] Sweep error:", error.message);
  }
}

export function startTokenRefreshJob() {
  setTimeout(runTokenRefreshSweep, 60 * 1000).unref(); // startup ke 1 min baad
  setInterval(runTokenRefreshSweep, JOB_INTERVAL_MS).unref();
  console.log("[TokenRefresh] Auto-refresh job started (every 12h, threshold 10d)");
}