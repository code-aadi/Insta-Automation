import mongoose from "mongoose";
import { config } from "./env.js";

async function databaseConnection() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection error:", error.message);
    throw error;
  }
}

export default databaseConnection;