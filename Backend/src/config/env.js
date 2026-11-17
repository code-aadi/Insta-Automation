import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,

  verifyToken: process.env.VERIFY_TOKEN,

  apiVersion: process.env.GRAPH_API_VERSION || "v21.0",

  mongodbUri: process.env.MONGODB_URI,

  encryptionKey: process.env.ENCRYPTION_KEY,

  adminApiKey: process.env.ADMIN_API_KEY,
};