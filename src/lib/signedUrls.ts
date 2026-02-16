import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

/**
 * Get a signed URL for a private storage file
 * @param bucketName The storage bucket name
 * @param filePath The path to the file in the bucket
 * @returns The signed URL or null if failed
 */
export async function getSignedUrl(bucketName: string, filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

    if (error) {
      logger.error("Error creating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    logger.error("Failed to get signed URL:", err);
    return null;
  }
}

/**
 * Get multiple signed URLs at once
 * @param bucketName The storage bucket name
 * @param filePaths Array of file paths
 * @returns Array of signed URLs (null for failed ones)
 */
export async function getSignedUrls(
  bucketName: string,
  filePaths: string[],
): Promise<(string | null)[]> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrls(filePaths, SIGNED_URL_EXPIRY);

    if (error) {
      logger.error("Error creating signed URLs:", error);
      return filePaths.map(() => null);
    }

    return data.map((item) => item.signedUrl);
  } catch (err) {
    logger.error("Failed to get signed URLs:", err);
    return filePaths.map(() => null);
  }
}

/**
 * Extract file path from a full URL
 * @param url The full storage URL
 * @param bucketName The bucket name to extract from
 * @returns The file path or null
 */
export function extractFilePath(url: string, bucketName: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/${bucketName}/`);
    if (pathParts.length > 1) {
      return pathParts[1];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a signed URL (already has token)
 */
export function isSignedUrl(url: string): boolean {
  return url.includes("token=");
}
