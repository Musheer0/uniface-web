import { SiteHeader } from "@/components/site-header"

export default function BillingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader title="Billing" />
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <p className="text-sm text-muted-foreground">
          Plans, usage, and invoices will be managed here.
        </p>
      </div>
    </div>
  )
}
