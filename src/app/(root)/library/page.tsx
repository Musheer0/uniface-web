import { SiteHeader } from "@/components/site-header"

export default function LibraryPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader title="Library" />
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <p className="text-sm text-muted-foreground">
          Your uploaded media and past projects will live here.
        </p>
      </div>
    </div>
  )
}
