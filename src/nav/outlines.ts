import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OutlinesStore {
  /** Draw the traced SVG outlines on top of the live 3D (dev "view → outlines", or `?outlines`). */
  overlay: boolean
  setOverlay: (v: boolean) => void
}

const forced = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('outlines')

const init = (set: (p: Partial<OutlinesStore>) => void): OutlinesStore => ({
  overlay: forced,
  setOverlay: (overlay) => set({ overlay }),
})

export const useOutlines = import.meta.env.DEV
  ? create<OutlinesStore>()(
      persist(init, {
        name: 'outlines',
        partialize: (s) => ({ overlay: s.overlay }),
        merge: (persisted, current) => ({ ...current, ...(persisted as Partial<OutlinesStore>), ...(forced ? { overlay: true } : {}) }),
      }),
    )
  : create<OutlinesStore>()(init)
