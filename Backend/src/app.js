import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import webhookRoutes from "./routes/webhook.routes.js";
import authRoutes from "./routes/auth.routes.js";
import accountRoutes from "./routes/account.routes.js";

const app = express();

// Frontend requests allow karne ke liye CORS
app.use(
  cors({
    origin: config.frontendUrl.replace(/\/$/, ""),
    credentials: true,
  })
);

// JSON request body ko read karne ke liye
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/webhook", webhookRoutes);
app.use("/auth", authRoutes);
app.use("/api/account", accountRoutes);

export default app;