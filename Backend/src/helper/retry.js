import { delay } from "./delay.js";
export async function retryDatabaseUpdate(
  updateFunction,
  maxAttempts = 3
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await updateFunction();

      if (!result) {
        throw new Error("Database document not found");
      }

      return true;

    } catch (error) {
      console.error(
        `Database update failed. Attempt ${attempt}:`,
        error.message
      );

      if (attempt < maxAttempts) {
        await delay(1000 * attempt);
      }
    }
  }

  return false;
}