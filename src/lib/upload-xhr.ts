/** POST a file to an S3 presigned-POST URL with XHR so we get upload progress. */
export function uploadViaXHR(
  url: string,
  fields: Record<string, string>,
  file: File,
  onProgress: (pct: number) => void,
  signalRef: { current: XMLHttpRequest | null },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    signalRef.current = xhr
    xhr.open("POST", url)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      // S3 returns 200 | 201 | 204 on success depending on config
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error("Network error during upload"))
    xhr.onabort = () => reject(new Error("Upload cancelled"))

    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value)
    }
    // S3 requires `file` to be the last field
    form.append("file", file)
    xhr.send(form)
  })
}
