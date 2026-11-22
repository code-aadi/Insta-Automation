import app from "./app.js";
import databaseConnection from "./config/database.js";
import { config } from "./config/env.js";
import { startTokenRefreshJob } from "./services/tokenRefresh.service.js";

async function startServer() {
  try {
    await databaseConnection();

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });

    startTokenRefreshJob();
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1); 
  }
}

startServer();