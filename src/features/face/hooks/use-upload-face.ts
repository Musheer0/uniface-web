"use client"

import { useTRPC } from "@/trpc/client"
import { useMutation } from "@tanstack/react-query"

export const useUploadFace = () => {
  const trpc = useTRPC()
  return useMutation(trpc.face.uploadFace.mutationOptions())
}

export const useDeleteFace = () => {
  const trpc = useTRPC()
  return useMutation(trpc.face.deleteFace.mutationOptions())
}
