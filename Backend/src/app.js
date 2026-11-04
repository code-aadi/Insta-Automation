
import express from "express";
import webhookRoutes from "./routes/webhook.routes.js";

const app = express();

// JSON request body ko read karne ke liye
app.use(express.json());

// Webhook routes
app.use("/webhook", webhookRoutes);

export default app;
