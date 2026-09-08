import { create } from 'zustand'

/**
 * Live-tunable scene parameters. Defaults are the shipped values; in dev, `DevControls`
 * (leva) writes into this store so the whole scene can be tuned without touching code.
 * leva itself is only imported in dev (see index.tsx), so prod has no dependency on it.
 */
export interface GlassTuning {
  color: string
  metalness: number
  roughness: number
  /** Womp "Glass". */
  transmission: number
  thickness: number
  ior: number
  specularColor: string
  specularIntensity: number
  /** Womp "Subsurface color": what light picks up while travelling through the volume. */
  attenuationColor: string
  /** Derived from Womp "Translucency weight" (Beer–Lambert, see presets). */
  attenuationDistance: number
  sheen: number
  sheenRoughness: number
  sheenColor: string
  iridescence: number
  iridescenceIOR: number
  iridescenceThicknessMin: number
  iridescenceThicknessMax: number
  clearcoat: number
  clearcoatRoughness: number
  /** drei's dispersion-like refraction split (0–1). Womp "Dispersion" maps here. */
  chromaticAberration: number
  anisotropicBlur: number
  distortion: number
  distortionScale: number
  temporalDistortion: number
  envMapIntensity: number
  opacity: number
  samples: number
  resolution: number
  /** Colour the transmission buffer sees behind the glass; gives the milky, frosted body. */
  background: string
  /** Strength of the procedural waviness normal map (not a Womp parameter). */
  normalScale: number
  normalRepeat: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Positions/sizes in CSS px (nav space: 100px = 1 unit), rotations in degrees. */
export interface RectLightTuning {
  name: string
  color: string
  /** RectAreaLight intensity (nits). */
  intensity: number
  width: number
  height: number
  position: Vec3
  rotation: Vec3
}

export interface OverheadLightTuning {
  color: string
  /** SpotLight intensity (candela). */
  intensity: number
  position: Vec3
  /** Point the cone at this position. */
  target: Vec3
  /** Cone angle in degrees. */
  angle: number
  penumbra: number
}

export interface LightsTuning {
  /** Draw light helpers (spot cone, rect outlines). */
  debug: boolean
  overhead: OverheadLightTuning
  rects: RectLightTuning[]
}

export interface Tuning {
  glass: GlassTuning
  lights: LightsTuning
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

/**
 * Named looks. `referenceTune` is the hand-tuned match of docs/reference.png; `roughGlass`
 * is the Womp material "Rough Glass" translated parameter by parameter (see comments).
 */
export const glassPresets = {
  roughGlass: {
    // Womp: Color #FFFFFF, Metalness 0, Roughness 7.5, Glass 100
    color: '#ffffff',
    metalness: 0,
    roughness: 0.075,
    transmission: 1,
    thickness: 0.5,
    // Womp: IOR 1.89
    ior: 1.89,
    // Womp: Specular color #CAF543, Specular tint 0 (three has no tint; specularColor carries the hue)
    specularColor: '#caf543',
    specularIntensity: 1,
    // Womp: Subsurface color #CAF543, Absorption 0, Subsurface scattering 0, Translucency weight 28.13.
    // three has no SSS; the closest is volume attenuation. Beer–Lambert gives colour^(thickness/distance),
    // so distance = thickness / 0.2813 makes the tint act at 28.13% strength through the pill.
    attenuationColor: '#caf543',
    attenuationDistance: 0.5 / 0.2813,
    // Womp: Sheen strength 12.5, Sheen roughness 9.38 (sheen colour is not a Womp parameter: white)
    sheen: 0.125,
    sheenRoughness: 0.0938,
    sheenColor: '#ffffff',
    // Womp: Iridescence 0
    iridescence: 0,
    iridescenceIOR: 1.3,
    iridescenceThicknessMin: 100,
    iridescenceThicknessMax: 400,
    // Womp has no clearcoat parameter
    clearcoat: 0,
    clearcoatRoughness: 0,
    // Womp: Dispersion 1100 with an unknown maximum. drei's transmission shader has no Abbe-number
    // dispersion; its chromaticAberration (0–1) is the analogue. 1100 is taken as the slider's
    // top, so this is 1.0 — lower it if 1100 turns out to be mid-range.
    chromaticAberration: 1,
    anisotropicBlur: 0.1,
    distortion: 0,
    distortionScale: 0,
    temporalDistortion: 0,
    envMapIntensity: 1.4,
    // Womp: Emission 0 (nothing to map), Subsurface opacity 100
    opacity: 1,
    samples: 6,
    resolution: 512,
    background: '#8d93a8',
    normalScale: 0.3,
    normalRepeat: 1.2,
  },
  referenceTune: {
    color: '#f4f6ff',
    metalness: 0,
    roughness: 0.12,
    transmission: 0.85,
    thickness: 0.6,
    ior: 1.5,
    specularColor: '#ffffff',
    specularIntensity: 1,
    attenuationColor: '#dfe7ff',
    attenuationDistance: 2.5,
    sheen: 0,
    sheenRoughness: 1,
    sheenColor: '#ffffff',
    iridescence: 1,
    iridescenceIOR: 1.9,
    iridescenceThicknessMin: 150,
    iridescenceThicknessMax: 700,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    chromaticAberration: 0.25,
    anisotropicBlur: 0.15,
    distortion: 0.12,
    distortionScale: 0.4,
    temporalDistortion: 0.03,
    envMapIntensity: 1.8,
    opacity: 1,
    samples: 6,
    resolution: 512,
    background: '#8d93a8',
    normalScale: 0.7,
    normalRepeat: 1.2,
  },
} satisfies Record<string, GlassTuning>

export type GlassPreset = keyof typeof glassPresets

export const defaultLights: LightsTuning = {
  debug: false,
  overhead: {
    color: '#ffffff',
    intensity: 60,
    position: { x: 0, y: 320, z: 260 },
    target: { x: 0, y: 0, z: 0 },
    angle: 40,
    penumbra: 0.6,
  },
  rects: [
    // key: wide panel above and in front, tilted down at the pill
    { name: 'key', color: '#ffffff', intensity: 6, width: 700, height: 220, position: { x: 0, y: 260, z: 320 }, rotation: { x: -40, y: 0, z: 0 } },
    // fill: cool panel from the left
    { name: 'fill', color: '#cfe0ff', intensity: 3, width: 260, height: 420, position: { x: -520, y: 20, z: 240 }, rotation: { x: 0, y: 60, z: 0 } },
    // rim: warm panel from the right
    { name: 'rim', color: '#ffd6ea', intensity: 3, width: 260, height: 420, position: { x: 520, y: 40, z: 240 }, rotation: { x: 0, y: -60, z: 0 } },
  ],
}

export const defaultTuning: Tuning = {
  glass: glassPresets.roughGlass,
  lights: defaultLights,
  env: { intensity: 1, rotation: 0 },
  post: { bloomIntensity: 0.25, bloomThreshold: 0.85, bloomSmoothing: 0.4, aberration: 0.0004 },
}

type TuningStore = Tuning & {
  set: <K extends keyof Tuning>(group: K, patch: Partial<Tuning[K]>) => void
  applyPreset: (name: GlassPreset) => void
}

export const useTuning = create<TuningStore>()((set) => ({
  ...defaultTuning,
  set: (group, patch) => set((s) => ({ [group]: { ...s[group], ...patch } }) as Partial<Tuning>),
  applyPreset: (name) => set({ glass: glassPresets[name] }),
}))

declare global {
  interface Window {
    /** Dev-only handle for headless tuning scripts. */
    __navTuning?: typeof useTuning
  }
}
if (import.meta.env.DEV && typeof window !== 'undefined') window.__navTuning = useTuning
