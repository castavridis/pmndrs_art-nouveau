import { create } from 'zustand'

export interface LcReading {
  /** APCA Lc against the median backdrop pixel behind the text. */
  median: number
  /** APCA Lc against the 10% of backdrop closest in lightness to the ink (worst case). */
  worst: number
}

interface LcStore {
  readings: Record<string, LcReading>
  publish: (patch: Record<string, LcReading>) => void
}

/** Live legibility readings from the in-canvas probes (dev only; see LcProbe.tsx). */
export const useLcReadings = create<LcStore>()((set) => ({
  readings: {},
  publish: (patch) => set((s) => ({ readings: { ...s.readings, ...patch } })),
}))
