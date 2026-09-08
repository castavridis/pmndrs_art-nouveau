import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/** False during SSR and hydration's first pass, true once running in the browser. */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
