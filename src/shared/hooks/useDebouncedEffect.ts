import { useEffect } from 'react'

export function useDebouncedEffect(
  effect: () => void,
  deps: ReadonlyArray<unknown>,
  delayMs: number,
): void {
  useEffect(() => {
    const handle = setTimeout(effect, delayMs)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delayMs])
}
