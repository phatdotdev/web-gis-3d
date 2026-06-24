export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number,
): (...args: TArgs) => void {
  let lastRun = 0
  let trailingId: number | undefined

  return (...args: TArgs) => {
    const now = Date.now()
    const remaining = waitMs - (now - lastRun)

    if (remaining <= 0) {
      window.clearTimeout(trailingId)
      lastRun = now
      fn(...args)
      return
    }

    window.clearTimeout(trailingId)
    trailingId = window.setTimeout(() => {
      lastRun = Date.now()
      fn(...args)
    }, remaining)
  }
}
