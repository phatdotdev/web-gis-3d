export async function chunkedRender<TItem>(
  items: TItem[],
  chunkSize: number,
  renderItem: (item: TItem, index: number) => void,
  onProgress?: (rendered: number, total: number) => void,
): Promise<void> {
  const safeChunkSize = Math.max(1, chunkSize)

  for (let start = 0; start < items.length; start += safeChunkSize) {
    const end = Math.min(start + safeChunkSize, items.length)
    for (let index = start; index < end; index += 1) {
      renderItem(items[index], index)
    }
    onProgress?.(end, items.length)
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
  }
}
