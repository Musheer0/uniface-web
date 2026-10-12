"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTRPC } from "@/trpc/client"

export const useUploadFace = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  return useMutation(
    trpc.face.uploadFace.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.face.getAll.queryFilter())
      },
    }),
  )
}

export const useDeleteFace = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  return useMutation(
    trpc.face.deleteFace.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.face.getAll.queryFilter())
      },
    }),
  )
}
