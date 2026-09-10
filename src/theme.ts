import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** `system` survives only so a value stored before it was retired still parses. */
export type ThemeChoice = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeStore {
  theme: ThemeChoice
  setTheme: (t: ThemeChoice) => void
}

/*
 * The demo never follows the OS preference: every page opens dark, except the cube, which opens
 * light. Each keeps its own remembered choice, so switching one does not flip the other. The same
 * rule runs before first paint in index.html, so no stylesheet ever falls back to the OS.
 */
const onCube = typeof window !== 'undefined' && window.location.pathname.startsWith('/dev/cube')
export const DEFAULT_THEME: ResolvedTheme = onCube ? 'light' : 'dark'
export const THEME_KEY = onCube ? 'theme-cube' : 'theme'

/** The user's choice, remembered per browser; the page's default until they make one. */
export const useThemeStore = create<ThemeStore>()(
  persist((set) => ({ theme: DEFAULT_THEME, setTheme: (theme) => set({ theme }) }), { name: THEME_KEY }),
)

/** The scheme in effect. A stored `system` from before resolves to the page default, not the OS. */
export function useResolvedTheme(): ResolvedTheme {
  const choice = useThemeStore((s) => s.theme)
  return choice === 'light' || choice === 'dark' ? choice : DEFAULT_THEME
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
