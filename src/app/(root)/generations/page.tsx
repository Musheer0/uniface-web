import { SiteHeader } from "@/components/site-header"

export default function GenerationsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader title="Generations" />
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <p className="text-sm text-muted-foreground">
          Blurred videos and processing history will appear here.
        </p>
      </div>
    </div>
  )
}
