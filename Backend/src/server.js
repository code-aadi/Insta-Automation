
import app from "./app.js";
import databaseConnection from "./config/database.js";
import { config } from "./config/env.js";

async function startServer() {
  try {
    await databaseConnection();

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error.message);
  }
}

startServer();