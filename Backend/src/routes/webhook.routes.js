import express from "express";
import {
  verifyWebhook,
  receiveWebhook,
} from "../controllers/webhook.controller.js";
import { verifyWebhookSignature } from "../middleware/webhookSignature.middleware.js";

const router = express.Router();

router.get("/", verifyWebhook);                              
router.post("/", verifyWebhookSignature, receiveWebhook);    
export default router;