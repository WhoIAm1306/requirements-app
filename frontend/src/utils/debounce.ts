/**
 * Откладывает вызов fn до паузы в ms (удобно для resize без лишних пересчётов layout).
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, ms)
  }
}
