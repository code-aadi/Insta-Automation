import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!decoded?.botIgId) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    req.botIgId = decoded.botIgId;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Token expired or invalid" });
  }
};