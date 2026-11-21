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

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/webhook", webhookRoutes);
app.use("/auth", authRoutes);
app.use("/api/account", accountRoutes);

export default app;