import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PrintTextStore {
  /**
   * Print component copy into the glass itself (so it refracts, and breaks apart when the
   * glass does) rather than laying DOM text over it. Off falls back to plain DOM text.
   */
  enabled: boolean
  setEnabled: (v: boolean) => void
}

const init = (set: (p: Partial<PrintTextStore>) => void): PrintTextStore => ({
  enabled: true,
  setEnabled: (enabled) => set({ enabled }),
})

// Dev: the choice survives reloads so it can be compared against the DOM version.
export const usePrintText = import.meta.env.DEV
  ? create<PrintTextStore>()(persist(init, { name: 'print-text', partialize: (s) => ({ enabled: s.enabled }) }))
  : create<PrintTextStore>()(init)
