export const MAX_PHOTO_LIMIT = 15 * 1024 * 1024; // 15 MB
export const MAX_VIDEO_LIMIT = 200 * 1024 * 1024; // 200 MB

// Face download URLs — presigned S3 GETs valid for 1 day (in seconds).
export const DOWNLOAD_URL_EXPIRES_IN = 60 * 60 * 24;

// Redis TTL for cached download URLs (in seconds). Deliberately 1h under the
// presigned expiry so a cached URL is never served expired.
export const DOWNLOAD_URL_CACHE_TTL = DOWNLOAD_URL_EXPIRES_IN - 60 * 60;

// Presigned S3 POSTs for uploads, valid for 1 hour (in seconds).
export const UPLOAD_URL_EXPIRES_IN = 60 * 60;

// Redis TTL for cached generation DTOs (in seconds). Kept short so status
// polling stays fresh; writes invalidate the key explicitly.
export const GENERATION_CACHE_TTL = 60;
