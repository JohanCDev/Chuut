import { useCallback, useSyncExternalStore } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

const TABLET = '(min-width: 768px)'
const DESKTOP = '(min-width: 1200px)'

const subscribeBreakpoint = (onChange: () => void) => {
  const lists = [window.matchMedia(TABLET), window.matchMedia(DESKTOP)]
  lists.forEach((list) => list.addEventListener('change', onChange))
  return () => lists.forEach((list) => list.removeEventListener('change', onChange))
}

const getBreakpoint = (): Breakpoint => {
  if (window.matchMedia(DESKTOP).matches) return 'desktop'
  if (window.matchMedia(TABLET).matches) return 'tablet'
  return 'mobile'
}

/** Current layout tier: mobile below 768px, tablet to 1200px, desktop above. */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribeBreakpoint, getBreakpoint, () => 'mobile')
}

/** Whether a media query currently matches. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
