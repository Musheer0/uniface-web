"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTRPC } from "@/trpc/client"

/** All faces of the current user, each with a presigned `url` (no `object_key`). */
export const useFaces = () => {
  const trpc = useTRPC()
  return useQuery(trpc.face.getAll.queryOptions())
}

/** Single face by id, with a presigned `url` (no `object_key`). */
export const useFace = (id: string, enabled = true) => {
  const trpc = useTRPC()
  return useQuery(
    trpc.face.getById.queryOptions({ id }, { enabled: enabled && id.length > 0 }),
  )
}

/** Rename a face; refreshes the face lists on success. */
export const useUpdateFace = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  return useMutation(
    trpc.face.updateFace.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.face.getAll.queryFilter())
        queryClient.invalidateQueries(trpc.face.getById.queryFilter({ id: data.id }))
      },
    }),
  )
}
