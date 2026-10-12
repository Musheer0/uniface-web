/** Redis key for a cached S3 presigned download URL. */
export const faceUrlKey = (objectKey: string) => `s3:url:${objectKey}`;
