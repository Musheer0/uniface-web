"use client"

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { inferRouterOutputs } from "@trpc/server"
import { useTRPC } from "@/trpc/client"
import type { AppRouter } from "@/trpc/routers/_app"

type RouterOutputs = inferRouterOutputs<AppRouter>

/** Public media shape returned by `getAll` / `getById` (no `object_key`). */
export type MediaDTO = RouterOutputs["media"]["getAll"]["items"][number]

/** Cursor-paginated media of the current user, newest first. */
export const useMedias = (limit = 20) => {
  const trpc = useTRPC()
  return useInfiniteQuery(
    trpc.media.getAll.infiniteQueryOptions(
      { limit },
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    ),
  )
}

/** Single media row by id, with a presigned `url` (no `object_key`). */
export const useMediaById = (id: string, enabled = true) => {
  const trpc = useTRPC()
  return useQuery(
    trpc.media.getById.queryOptions({ id }, { enabled: enabled && id.length > 0 }),
  )
}

/** Create a media row + presigned POST; refreshes the media list on success. */
export const useUploadMedia = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  return useMutation(
    trpc.media.uploadMedia.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.media.getAll.queryFilter())
      },
    }),
  )
}

/** Delete a media row (plus dependent faces); refreshes list + detail. */
export const useDeleteMedia = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  return useMutation(
    trpc.media.deleteMedia.mutationOptions({
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries(trpc.media.getAll.queryFilter())
        queryClient.invalidateQueries(trpc.media.getById.queryFilter({ id: variables.id }))
      },
    }),
  )
}
