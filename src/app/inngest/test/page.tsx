"use client"

import { useState } from "react"
import { FlaskConical, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function InngestTestPage() {
  const [name, setName] = useState("world")
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sendEvent = async () => {
    if (isSending) return
    setIsSending(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/inngest-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to send event")
      setResult(JSON.stringify(json, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send event")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 py-12">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FlaskConical className="size-5" />
        </span>
        <div>
          <h1 className="font-heading text-xl font-medium">Inngest test</h1>
          <p className="text-sm text-muted-foreground">
            Fire <code className="font-mono text-[0.9em]">app/test.triggered</code> at the{" "}
            <code className="font-mono text-[0.9em]">test-hello</code> function.
          </p>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="test-name">Name payload</Label>
        <Input
          id="test-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="world"
        />
      </div>

      <Button type="button" disabled={isSending} onClick={sendEvent}>
        {isSending && <Loader2 className="animate-spin" />}
        {isSending ? "Sending…" : "Send test event"}
      </Button>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs">
          {result}
        </pre>
      )}

      <p className="text-xs text-muted-foreground">
        Watch the run at{" "}
        <a
          className="underline underline-offset-4 hover:text-foreground"
          href="http://localhost:8288"
          target="_blank"
          rel="noreferrer"
        >
          localhost:8288
        </a>{" "}
        (start it with <code className="font-mono">npx inngest-cli dev</code>).
      </p>
    </div>
  )
}
