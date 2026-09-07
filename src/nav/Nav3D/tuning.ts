import { create } from 'zustand'

/**
 * Live-tunable scene parameters. Defaults are the shipped values; in dev, `DevControls`
 * (leva) writes into this store so the whole scene can be tuned without touching code.
 * leva itself is only imported in dev (see index.tsx), so prod has no dependency on it.
 */
export interface Tuning {
  glass: {
    transmission: number
    thickness: number
    roughness: number
    ior: number
    chromaticAberration: number
    anisotropicBlur: number
    distortion: number
    distortionScale: number
    temporalDistortion: number
    iridescence: number
    iridescenceIOR: number
    iridescenceThicknessMin: number
    iridescenceThicknessMax: number
    clearcoat: number
    clearcoatRoughness: number
    envMapIntensity: number
    color: string
    attenuationColor: string
    attenuationDistance: number
    samples: number
    resolution: number
    /** Colour the transmission buffer sees behind the glass; gives the milky, frosted body. */
    background: string
    /** Strength of the procedural waviness normal map. */
    normalScale: number
    normalRepeat: number
  }
  env: {
    intensity: number
    rotation: number
  }
  post: {
    bloomIntensity: number
    bloomThreshold: number
    bloomSmoothing: number
    aberration: number
  }
}

export const defaultTuning: Tuning = {
  glass: {
    transmission: 0.85,
    thickness: 0.6,
    roughness: 0.12,
    ior: 1.5,
    chromaticAberration: 0.25,
    anisotropicBlur: 0.15,
    distortion: 0.12,
    distortionScale: 0.4,
    temporalDistortion: 0.03,
    iridescence: 1,
    iridescenceIOR: 1.9,
    iridescenceThicknessMin: 150,
    iridescenceThicknessMax: 700,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.8,
    color: '#f4f6ff',
    attenuationColor: '#dfe7ff',
    attenuationDistance: 2.5,
    samples: 6,
    resolution: 512,
    background: '#8d93a8',
    normalScale: 0.7,
    normalRepeat: 1.2,
  },
  env: { intensity: 1, rotation: 0 },
  post: { bloomIntensity: 0.25, bloomThreshold: 0.85, bloomSmoothing: 0.4, aberration: 0.0008 },
}

type TuningStore = Tuning & {
  set: <K extends keyof Tuning>(group: K, patch: Partial<Tuning[K]>) => void
}

export const useTuning = create<TuningStore>()((set) => ({
  ...defaultTuning,
  set: (group, patch) => set((s) => ({ [group]: { ...s[group], ...patch } }) as Partial<Tuning>),
}))

declare global {
  interface Window {
    /** Dev-only handle for headless tuning scripts. */
    __navTuning?: typeof useTuning
  }
}
if (import.meta.env.DEV && typeof window !== 'undefined') window.__navTuning = useTuning
