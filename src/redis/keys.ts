/** Redis key for a cached S3 presigned download URL. */
export const faceUrlKey = (objectKey: string) => `s3:url:${objectKey}`;

/** Redis key for a cached S3 presigned download URL (media). Same scheme as faces. */
export const mediaUrlKey = (objectKey: string) => `s3:url:${objectKey}`;

/** Redis key for a cached generation DTO. Scoped by user id. */
export const generationKey = (userId: string, generationId: string) =>
  `generation:${userId}:${generationId}`;
