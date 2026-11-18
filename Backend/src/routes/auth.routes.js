import express from "express";
import {
  startInstagramLogin,
  instagramCallback,
} from "../controllers/auth.controller.js";

const router = express.Router();

// Login start: GET /auth/instagram
router.get("/instagram", startInstagramLogin);

// Meta redirect callback: GET /auth/callback
router.get("/callback", instagramCallback);

export default router;