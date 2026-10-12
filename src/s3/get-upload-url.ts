"use server"
import { MAX_PHOTO_LIMIT, MAX_VIDEO_LIMIT } from '@/lib/constants'
import {createPresignedPost} from '@aws-sdk/s3-presigned-post'
import { bucket, s3 } from './client'
import { TRPCError } from '@trpc/server'
export const getUploadUrl = async (key: string, contentType: string) => {
  if(!(contentType.includes("video")||contentType.includes("image"))) throw new TRPCError({code:"UNSUPPORTED_MEDIA_TYPE"})
  const max_file_size = contentType.startsWith("image") ? MAX_PHOTO_LIMIT : MAX_VIDEO_LIMIT;
  const response = await createPresignedPost(s3, {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ["content-length-range", 0, max_file_size],
      ["eq", "$Content-Type", contentType]
    ],
    Fields: {
      "Content-Type": contentType
    },
    Expires:60*60
  });
  return response;
}