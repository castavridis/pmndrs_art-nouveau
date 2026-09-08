import { useEffect, useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeStore {
  theme: ThemeChoice
  setTheme: (t: ThemeChoice) => void
}

/** The user's choice; dark by default, `system` follows prefers-color-scheme. Persisted per browser. */
export const useThemeStore = create<ThemeStore>()(
  persist((set) => ({ theme: 'dark', setTheme: (theme) => set({ theme }) }), { name: 'theme' }),
)

const query = () =>
  typeof window !== 'undefined' && 'matchMedia' in window ? window.matchMedia('(prefers-color-scheme: light)') : null

const subscribeSystem = (cb: () => void) => {
  const q = query()
  q?.addEventListener('change', cb)
  return () => q?.removeEventListener('change', cb)
}
const systemTheme = (): ResolvedTheme => (query()?.matches ? 'light' : 'dark')

/** The scheme in effect: the stored choice, or the OS preference. Dark during SSR. */
export function useResolvedTheme(): ResolvedTheme {
  const choice = useThemeStore((s) => s.theme)
  const system = useSyncExternalStore(subscribeSystem, systemTheme, () => 'dark' as ResolvedTheme)
  return choice === 'system' ? system : choice
}

/**
 * Stamps `data-theme` on <html> so CSS (index.css) and the outline images follow the
 * resolved scheme. Render once per page.
 */
export function ThemeApplier() {
  const resolved = useResolvedTheme()
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
  }, [resolved])
  return null
}
