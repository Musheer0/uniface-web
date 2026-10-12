"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTRPC } from "@/trpc/client"

/**
 * Plain upload mutation with no cache side-effects — the upload dialog seeds
 * the new face into the faces cache itself via `setQueryData` on success.
 */
export const useUploadFace = () => {
  const trpc = useTRPC()
  return useMutation(trpc.face.uploadFace.mutationOptions())
}

export const useDeleteFace = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  return useMutation(
    trpc.face.deleteFace.mutationOptions({
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries(trpc.face.getAll.queryFilter())
        if (variables.faceId) {
          queryClient.invalidateQueries(
            trpc.face.getById.queryFilter({ id: variables.faceId }),
          )
        }
      },
    }),
  )
}
