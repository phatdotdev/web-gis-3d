const objectUrls = new Map<string, string>()

export function createStoredObjectUrl(file: File): string {
  const key = `${file.name}-${file.size}-${file.lastModified}`
  const existing = objectUrls.get(key)
  if (existing) {
    return existing
  }

  const url = URL.createObjectURL(file)
  objectUrls.set(key, url)
  return url
}

export function revokeStoredObjectUrls(): void {
  objectUrls.forEach((url) => URL.revokeObjectURL(url))
  objectUrls.clear()
}
