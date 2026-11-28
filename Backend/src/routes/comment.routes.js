import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listCommentRules, createCommentRule, updateCommentRule, deleteCommentRule,
  restoreCommentRule, reorderCommentRules, bulkCommentRules,
  listCommentMedia, syncCommentMedia, listCommentActivity,
} from "../controllers/comment.controller.js";

const router = express.Router();
router.use(requireAuth);

router.get("/rules", listCommentRules);
router.post("/rules", createCommentRule);
router.post("/rules/restore", restoreCommentRule);
router.patch("/rules/reorder", reorderCommentRules);
router.post("/rules/bulk", bulkCommentRules);
router.patch("/rules/:ruleId", updateCommentRule);
router.delete("/rules/:ruleId", deleteCommentRule);

router.get("/media", listCommentMedia);
router.post("/media/sync", syncCommentMedia);

router.get("/activity", listCommentActivity);

export default router;