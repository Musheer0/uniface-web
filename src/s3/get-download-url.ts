import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DOWNLOAD_URL_CACHE_TTL, DOWNLOAD_URL_EXPIRES_IN } from "@/lib/constants";
import { redis } from "@/redis/client";
import { faceUrlKey } from "@/redis/keys";
import { bucket, s3 } from "./client";

/** Raw presigned GET URL for an object key, valid for 1 day. */
export const getDownloadUrl = async (key: string): Promise<string> => {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: DOWNLOAD_URL_EXPIRES_IN,
  });
};

/**
 * Cached presigned GET URL. Reads from Redis first; on miss, presigns a fresh
 * 1-day URL and caches it with a TTL matched to (just under) its expiry.
 */
export const getCachedDownloadUrl = async (key: string): Promise<string> => {
  const cacheKey = faceUrlKey(key);
  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) return cached;
  } catch (err) {
    // Cache is best-effort — fall through and presign on Redis errors.
    console.error(`[redis] GET ${cacheKey} failed`, err);
  }
  const url = await getDownloadUrl(key);
  try {
    await redis.set(cacheKey, url, { ex: DOWNLOAD_URL_CACHE_TTL });
  } catch (err) {
    console.error(`[redis] SET ${cacheKey} failed`, err);
  }
  return url;
};

/** Drop the cached URL for a key (face deleted/renamed). Never throws. */
export const invalidateDownloadUrl = async (key: string): Promise<void> => {
  try {
    await redis.del(faceUrlKey(key));
  } catch (err) {
    console.error(`[redis] DEL for ${key} failed`, err);
  }
};
