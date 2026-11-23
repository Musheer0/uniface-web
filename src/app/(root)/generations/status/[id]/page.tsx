import { SiteHeader } from "@/components/site-header"
import { GenerationStatus } from "@/features/generations/components/generation-status"

export default async function GenerationStatusPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader title="Generation status" />
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <GenerationStatus id={id} />
      </div>
    </div>
  )
}
