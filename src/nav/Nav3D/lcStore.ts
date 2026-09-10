import { create } from 'zustand'

export interface LcReading {
  /** APCA Lc of the chosen ink against the median backdrop pixel behind the text, veil included. */
  median: number
  /** APCA Lc against the 10% of backdrop closest in lightness to the ink (worst case). */
  worst: number
}

interface LcStore {
  readings: Record<string, LcReading>
  publish: (patch: Record<string, LcReading>) => void
}

/** Live legibility readings from the contrast probes (contrast.ts), for the dev panel. */
export const useLcReadings = create<LcStore>()((set) => ({
  readings: {},
  publish: (patch) => set((s) => ({ readings: { ...s.readings, ...patch } })),
}))
