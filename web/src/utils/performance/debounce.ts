export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number,
): (...args: TArgs) => void {
  let timeoutId: number | undefined

  return (...args: TArgs) => {
    window.clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => fn(...args), waitMs)
  }
}
