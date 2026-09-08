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

/**
 * Lights are authored in Womp's frame so the values in Womp's inspector transfer 1:1:
 * position and area in inches (Womp "in"), rotation in degrees (Womp X/Y/Z), luminance as
 * Womp shows it. Lights.tsx converts to nav space: 1 in = 2.54 px (the navbar.glb is
 * ~400 px ≈ 157 in wide, matching the 144 in middle strip), and applies the same 180°
 * Y flip that assets.ts applies to the exported meshes.
 */
export interface RectLightTuning {
  name: string
  color: string
  /** Womp luminance. */
  luminance: number
  /** Womp Area X / Y, inches. */
  width: number
  height: number
  /** Inches, Womp frame. */
  position: Vec3
  /** Degrees, Womp frame. */
  rotation: Vec3
}

export interface OverheadLightTuning {
  color: string
  /** SpotLight intensity (candela). */
  intensity: number
  /** Inches, Womp frame. */
  position: Vec3
  target: Vec3
  /** Cone angle in degrees. */
  angle: number
  penumbra: number
}

export interface LightsTuning {
  /** Draw light helpers (rect outlines, spot cone) and pull the camera back. */
  debug: boolean
  /** Womp luminance → three RectAreaLight intensity (nits). */
  luminanceScale: number
  /** Optional overhead spot in addition to the Womp rect lights. */
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
  luminanceScale: 0.25,
  overhead: {
    color: '#ffffff',
    intensity: 0,
    position: { x: 0, y: 120, z: 100 },
    target: { x: 0, y: 0, z: 0 },
    angle: 40,
    penumbra: 0.6,
  },
  // Values read from the Womp inspector (pmndrs – poppies, 2026-09-07).
  rects: [
    // "Overhead Light": the large panel above the scene. Womp did not show its numbers, so
    // these are estimated from the viewport: roughly four nav widths wide, white, tilted at the nav.
    { name: 'overhead', color: '#ffffff', luminance: 6, width: 700, height: 160, position: { x: 0, y: 70, z: 25 }, rotation: { x: -60, y: 0, z: 0 } },
    { name: '45° top', color: '#caf543', luminance: 15, width: 98.62, height: 1.01, position: { x: 18.31, y: 38.7, z: 30.69 }, rotation: { x: -135, y: -180, z: -45 } },
    { name: '45° middle', color: '#caf543', luminance: 50, width: 144.04, height: 0.76, position: { x: -1.75, y: 14.65, z: 6.64 }, rotation: { x: -135, y: -180, z: -45 } },
    { name: '45° bottom', color: '#caf543', luminance: 15, width: 98.62, height: 0.53, position: { x: -14.04, y: -7.33, z: -9.99 }, rotation: { x: -135, y: -180, z: -45 } },
  ],
}

export const defaultTuning: Tuning = {
  glass: glassPresets.roughGlass,
  lights: defaultLights,
  env: { intensity: 0.15, rotation: 0 },
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
