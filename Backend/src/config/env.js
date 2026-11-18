import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,

  verifyToken: process.env.VERIFY_TOKEN,

  apiVersion: process.env.GRAPH_API_VERSION || "v21.0",

  mongodbUri: process.env.MONGODB_URI,

  encryptionKey: process.env.ENCRYPTION_KEY,

  // Instagram Business Login (OAuth)
  igAppId: process.env.IG_APP_ID,
  igAppSecret: process.env.IG_APP_SECRET,
  igRedirectUri: process.env.IG_REDIRECT_URI,
  igScopes:
    process.env.IG_SCOPES ||
    "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights",

  // Frontend & JWT Auth
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};


