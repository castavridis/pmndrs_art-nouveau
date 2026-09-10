import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import savedJson from './themes.saved.json'
import type { SchemeTunings } from './tuning'

/**
 * A named theme: the dark scheme and the light one together.
 *
 * A preset is a glass look, and `tuning.saved.json` is the single pair the app ships. Neither
 * lets you keep a whole light/dark set aside and come back to it, which is what this is for —
 * and it removes an ambiguity the single-scheme export had, where a pasted tuning did not say
 * which of the two schemes it belonged to.
 */
export type Theme = SchemeTunings

interface CustomThemesStore {
  themes: Record<string, Theme>
  add: (name: string, theme: Theme) => void
  remove: (name: string) => void
}

/** Shipped themes: themes.saved.json, written by "save themes to project". */
const saved = savedJson as Record<string, Theme>

const init = (set: (fn: (s: CustomThemesStore) => Partial<CustomThemesStore>) => void): CustomThemesStore => ({
  themes: saved,
  add: (name, theme) => set((s) => ({ themes: { ...s.themes, [name]: theme } })),
  remove: (name) =>
    set((s) => {
      const themes = { ...s.themes }
      delete themes[name]
      return { themes }
    }),
})

// Dev: unsaved themes survive reloads. Prod: the saved JSON only.
export const useCustomThemes = import.meta.env.DEV
  ? create<CustomThemesStore>()(
      persist(init, {
        name: 'custom-themes',
        partialize: (s) => ({ themes: s.themes }),
        merge: (persisted, current) => ({
          ...current,
          themes: { ...saved, ...((persisted as Partial<CustomThemesStore>)?.themes ?? {}) },
        }),
      }),
    )
  : create<CustomThemesStore>()(init)

declare global {
  interface Window {
    /** Dev-only handle, like `__navTuning`, for headless scripts. */
    __navThemes?: typeof useCustomThemes
  }
}
if (import.meta.env.DEV && typeof window !== 'undefined') window.__navThemes = useCustomThemes
