/**
 * Saves a remote file with a friendly name. Presigned S3 URLs are
 * cross-origin, so the `download` attribute on a plain link gets ignored —
 * fetch the blob and trigger the download ourselves. Falls back to opening
 * the URL in a new tab if the fetch fails.
 */
export async function downloadFile(url: string, filename: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error("Download failed")
    const objectUrl = URL.createObjectURL(await response.blob())
    const link = document.createElement("a")
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
  } catch {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}
