import { SiteHeader } from "@/components/site-header"
import { MediaList } from "@/features/medias/components/media-list"

export default function LibraryPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader title="Library" />
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <MediaList />
      </div>
    </div>
  )
}
