import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** What floats where on the cube page; persisted in dev so the leva choice survives reloads. */
export interface CubeScene {
  /** Keep every petal and flower inside the logo's blocks; nothing drifts around it. */
  insideOnly: boolean
  petalsInside: number
  petalsOutside: number
  flowersInside: number
  flowersOutside: number
}

export const defaultCubeScene: CubeScene = {
  insideOnly: false,
  petalsInside: 40,
  petalsOutside: 60,
  flowersInside: 6,
  flowersOutside: 10,
}

type Store = CubeScene & { set: (patch: Partial<CubeScene>) => void }
const init = (set: (p: Partial<Store>) => void): Store => ({ ...defaultCubeScene, set: (patch) => set(patch) })

export const useCubeScene = import.meta.env.DEV
  ? create<Store>()(persist(init, { name: 'cube-scene', partialize: (s) => ({ insideOnly: s.insideOnly, petalsInside: s.petalsInside, petalsOutside: s.petalsOutside, flowersInside: s.flowersInside, flowersOutside: s.flowersOutside }) }))
  : create<Store>()(init)

declare global {
  interface Window {
    /** Dev-only handle for headless scripts. */
    __cubeScene?: typeof useCubeScene
  }
}
if (import.meta.env.DEV && typeof window !== 'undefined') window.__cubeScene = useCubeScene
