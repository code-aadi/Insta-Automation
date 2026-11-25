import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getMyAccount,
  updateBusinessInfo,
  updateSettings,
  addKeywordRule,
  updateKeywordRule,
  deleteKeywordRule,
  addAiProvider,
  updateAiProvider,
  deleteAiProvider,
  getDashboardStats,
  getLeads,
  getConversationMessages,
  refreshToken,
  fetchModels,
  reorderAiProviders,
} from "../controllers/account.controller.js";

const router = express.Router();

// Neeche ki saari routes ke liye JWT login zaroori hai
router.use(requireAuth);

// Account profile & config
router.get("/me", getMyAccount);
router.patch("/business-info", updateBusinessInfo);
router.patch("/settings", updateSettings);
// Keyword rules CRUD
router.post("/rules", addKeywordRule);
router.patch("/rules/:ruleId", updateKeywordRule);
router.delete("/rules/:ruleId", deleteKeywordRule);

// AI providers (BYOK) CRUD
router.post("/ai-providers", addAiProvider);
router.patch("/ai-providers/reorder", reorderAiProviders);
router.patch("/ai-providers/:providerId", updateAiProvider);
router.delete("/ai-providers/:providerId", deleteAiProvider);

// Analytics, leads & chat logs
router.get("/stats", getDashboardStats);
router.get("/leads", getLeads);
router.get("/leads/:instagramId/messages", getConversationMessages);
router.post("/refresh-token", refreshToken);
router.post("/ai-providers/fetch-models", fetchModels);

export default router;