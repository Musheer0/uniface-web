"use client"

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { inferRouterOutputs } from "@trpc/server"
import { useTRPC } from "@/trpc/client"
import type { AppRouter } from "@/trpc/routers/_app"

type RouterOutputs = inferRouterOutputs<AppRouter>

/** Public generation shape returned by `getAll` / `getById` (output `url`, no keys). */
export type GenerationDTO = RouterOutputs["generation"]["getAll"]["items"][number]

/** Cursor-paginated generations of the current user, newest first. */
export const useGenerations = (limit = 20) => {
  const trpc = useTRPC()
  return useInfiniteQuery(
    trpc.generation.getAll.infiniteQueryOptions(
      { limit },
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    ),
  )
}

/** Single generation by id, with its output media `url`. */
export const useGenerationById = (id: string, enabled = true) => {
  const trpc = useTRPC()
  return useQuery(
    trpc.generation.getById.queryOptions({ id }, { enabled: enabled && id.length > 0 }),
  )
}

/** Delete a generation (plus its output artifacts); refreshes list + detail. */
export const useDeleteGeneration = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  return useMutation(
    trpc.generation.deleteGeneration.mutationOptions({
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries(trpc.generation.getAll.queryFilter())
        queryClient.invalidateQueries(trpc.generation.getById.queryFilter({ id: variables.id }))
      },
    }),
  )
}
