import { config } from "../config/env.js";
import {
  getInstagramAuthUrl,
  verifyOAuthState,
  handleInstagramCallback,
} from "../services/auth.service.js";

export const startInstagramLogin = (req, res) => {
  try {
    const authUrl = getInstagramAuthUrl();
    return res.redirect(authUrl);
  } catch (error) {
    console.error("Start Instagram Login Error:", error.message);
    return res.redirect(
      `${config.frontendUrl}/login?error=${encodeURIComponent("oauth_init_failed")}`
    );
  }
};

export const instagramCallback = async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // 1. User ne Cancel dabaya ya Meta se error aaya
  if (error || !code) {
    const msg = error_description || error || "authorization_cancelled";
    return res.redirect(
      `${config.frontendUrl}/login?error=${encodeURIComponent(msg)}`
    );
  }

  // 2. CSRF state check
  if (!verifyOAuthState(state)) {
    return res.redirect(
      `${config.frontendUrl}/login?error=${encodeURIComponent("invalid_state")}`
    );
  }

  // 3. Code -> Long-lived token -> DB save -> JWT ke saath frontend redirect
  try {
    const { token } = await handleInstagramCallback(code);
    return res.redirect(
      `${config.frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`
    );
  } catch (err) {
    console.error("Instagram OAuth Callback Error:", err.message);
    return res.redirect(
      `${config.frontendUrl}/login?error=${encodeURIComponent(err.message || "login_failed")}`
    );
  }
};