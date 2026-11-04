
import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,

  verifyToken: process.env.VERIFY_TOKEN,

  instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN,

  igUserId: process.env.IG_USER_ID,

  apiVersion: process.env.GRAPH_API_VERSION,

  mongodbUri : process.env.MONGODB_URI
};
