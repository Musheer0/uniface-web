import { SiteHeader } from "@/components/site-header"
import { GenerationsList } from "@/features/generations/components/generations-list"

export default function GenerationsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader title="Generations" />
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <GenerationsList />
      </div>
    </div>
  )
}
