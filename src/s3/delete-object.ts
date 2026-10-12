"use server"
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { bucket, s3 } from "./client";

/** Best-effort delete of a single S3 object. Never throws — cleanup must not mask the original error. */
export const deleteObject = async (key: string): Promise<void> => {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.error(`[s3] failed to delete object ${key}`, err);
  }
};
