import { unlink } from 'fs';
import { promisify } from 'util';

const unlinkAsync = promisify(unlink);

/**
 * Cleanup temporary file after processing
 * Safe for both local dev and Vercel serverless
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await unlinkAsync(filePath);
    console.log(`✅ Cleaned up temp file: ${filePath}`);
  } catch (error) {
    // File might already be deleted or not exist
    console.warn(`⚠️ Could not cleanup file ${filePath}:`, error);
  }
}

/**
 * Middleware wrapper to ensure file cleanup even on errors
 */
export function withFileCleanup<T>(
  handler: (filePath: string) => Promise<T>
): (filePath: string) => Promise<T> {
  return async (filePath: string) => {
    try {
      const result = await handler(filePath);
      await cleanupTempFile(filePath);
      return result;
    } catch (error) {
      await cleanupTempFile(filePath);
      throw error;
    }
  };
}
