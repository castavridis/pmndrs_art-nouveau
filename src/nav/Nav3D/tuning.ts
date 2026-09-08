import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import savedJson from './tuning.saved.json'

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
  /** Procedural noise in the sheen (0 = uniform). Modulates sheen colour and roughness. */
  sheenNoise: number
  /** Noise tiling across the surface. */
  sheenNoiseScale: number
  /** The same noise applied to roughness (0 = uniform): visible grain on flat faces. */
  roughnessNoise: number
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
  /**
   * Draw each rect light as a glowing strip in the scene and in the environment map. This is
   * what makes them show up in the glass: three's RectAreaLight itself is invisible and only
   * contributes diffuse light, whereas in Womp the emitter is seen refracted and reflected.
   */
  emitters: boolean
  /** Womp luminance → emitter brightness (colour multiplier). */
  emitterScale: number
  /** Sweep the rect strips across their own perpendicular (bottom-left → top-right), cycles per second. 0 = static. */
  sweep: number
  /** Sweep travel in inches. */
  sweepRange: number
  /** Optional overhead spot in addition to the Womp rect lights. */
  overhead: OverheadLightTuning
  rects: RectLightTuning[]
}

export interface Tuning {
  /** The preset the glass was last set from; edits on top of it keep the name. */
  preset: GlassPreset
  glass: GlassTuning
  lights: LightsTuning
  env: {
    intensity: number
    rotation: number
    /** Backdrop of the environment cubemap: what glass reflects where no panel is. */
    background: string
    /** Exponential depth fog in the backdrop colour; 0 disables it. */
    fog: number
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
/** Brand palette (from the design file). */
export const palette = {
  dark: '#36342f',
  light: '#eae5da',
  purple: '#d855f9',
  red: '#ff4980',
  orange: '#ffc043',
  yellow: '#ebff0f',
  green: '#caf543',
  teal: '#00f7a3',
  blue: '#2bdcf6',
} as const

export type PaletteName = keyof typeof palette

/** Rough Glass with its specular and subsurface colour swapped for a palette entry. */
const tinted = (hex: string): GlassTuning => ({ ...roughGlassBase, specularColor: hex, attenuationColor: hex })

const roughGlassBase = {
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
    sheenNoise: 0.6,
    sheenNoiseScale: 6,
    roughnessNoise: 0,
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
} satisfies GlassTuning

/**
 * Silver glass: the look of the latest Womp render (docs screenshot 2026-09-08): neutral
 * pale body, no colour tint, iridescent rim and a soft rainbow refraction line.
 */
const silverGlass: GlassTuning = {
  ...roughGlassBase,
  color: '#ffffff',
  specularColor: '#ffffff',
  attenuationColor: '#f2f3f8',
  attenuationDistance: 3,
  roughness: 0.05,
  ior: 1.45,
  thickness: 0.5,
  iridescence: 0.7,
  iridescenceIOR: 1.6,
  iridescenceThicknessMin: 150,
  iridescenceThicknessMax: 600,
  chromaticAberration: 0.3,
  clearcoat: 1,
  clearcoatRoughness: 0.05,
  sheen: 0.15,
  sheenColor: '#ffffff',
  envMapIntensity: 1.3,
  background: '#7b7e88',
  normalScale: 0.2,
  // Sharp glass: 3 blur samples are plenty and the buffered material's cost scales with them.
  samples: 3,
}

export const glassPresets = {
  silverGlass,
  roughGlass: roughGlassBase,
  /** Palette tints of Rough Glass. */
  dark: tinted(palette.dark),
  light: tinted(palette.light),
  purple: tinted(palette.purple),
  red: tinted(palette.red),
  orange: tinted(palette.orange),
  yellow: tinted(palette.yellow),
  green: tinted(palette.green),
  teal: tinted(palette.teal),
  blue: tinted(palette.blue),
  /**
   * Clear, dark glass for the "logo cubed" experiment: no milky backdrop, no waviness, a
   * thicker volume and strong chromatic aberration for the rainbow edges of the reference.
   */
  clearCube: {
    ...roughGlassBase,
    color: '#ffffff',
    specularColor: '#ffffff',
    attenuationColor: '#ffffff',
    attenuationDistance: 100,
    roughness: 0,
    // Low IOR + thin volume: the bevelled edges bend the view less, so the dark band at the
    // rim stays narrow; the aberration supplies the rainbow fringe of the reference.
    ior: 1.3,
    thickness: 0.3,
    chromaticAberration: 0.25,
    anisotropicBlur: 0,
    sheen: 0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    // Faces would otherwise mirror the big panel behind the camera and go grey.
    envMapIntensity: 0.3,
    background: '#000000',
    normalScale: 0,
    // Sharp glass needs no blur samples; a 1024 buffer keeps the interior crisp at 60fps.
    samples: 2,
    resolution: 1024,
  },
  /** Current-page indicator petal: Rough Glass with a stronger green body. */
  indicator: {
    ...roughGlassBase,
    color: '#dcff9a',
    specularColor: palette.green,
    attenuationColor: palette.green,
    // Tint acts at ~70% strength instead of 28%, so the petal reads green on its own.
    attenuationDistance: roughGlassBase.thickness / 0.7,
    sheenColor: palette.green,
    sheen: 0.3,
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
    sheenNoise: 0,
    sheenNoiseScale: 2,
    roughnessNoise: 0,
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
  emitters: true,
  emitterScale: 0.12,
  sweep: 0.08,
  sweepRange: 40,
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
    { name: 'overhead', color: '#ffffff', luminance: 6, width: 700, height: 200, position: { x: 0, y: 110, z: 30 }, rotation: { x: -80, y: 0, z: 0 } },
    { name: '45° top', color: '#caf543', luminance: 15, width: 98.62, height: 1.01, position: { x: 18.31, y: 38.7, z: 30.69 }, rotation: { x: -135, y: -180, z: -45 } },
    { name: '45° middle', color: '#caf543', luminance: 50, width: 144.04, height: 0.76, position: { x: -1.75, y: 14.65, z: 6.64 }, rotation: { x: -135, y: -180, z: -45 } },
    { name: '45° bottom', color: '#caf543', luminance: 15, width: 98.62, height: 0.53, position: { x: -14.04, y: -7.33, z: -9.99 }, rotation: { x: -135, y: -180, z: -45 } },
  ],
}

/** Code defaults, before anything saved from the leva panel. */
export const baseTuning: Tuning = {
  preset: 'silverGlass',
  glass: glassPresets.silverGlass,
  lights: defaultLights,
  env: { intensity: 0.6, rotation: 0, background: '#2a2d36', fog: 0 },
  post: { bloomIntensity: 0.25, bloomThreshold: 0.85, bloomSmoothing: 0.4, aberration: 0.0004 },
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** Merge saved values over defaults: objects recurse, arrays (the rect lights) replace whole. */
export function mergeTuning(base: Tuning, saved: DeepPartial<Tuning>): Tuning {
  const merge = <T extends object>(b: T, s: DeepPartial<T> | undefined): T => {
    if (!s) return b
    const out = { ...b } as Record<string, unknown>
    for (const [k, v] of Object.entries(s)) {
      const bv = (b as Record<string, unknown>)[k]
      out[k] =
        v && typeof v === 'object' && !Array.isArray(v) && bv && typeof bv === 'object' && !Array.isArray(bv)
          ? merge(bv as object, v as object)
          : v
    }
    return out as T
  }
  return merge(base, saved)
}

/**
 * What the scene starts from: code defaults + `tuning.saved.json` (written by the leva
 * panel's "save to project" button). In dev, unsaved edits also persist in localStorage.
 */
export const defaultTuning: Tuning = withPreset(
  mergeTuning(baseTuning, savedJson as DeepPartial<Tuning>),
  (savedJson as DeepPartial<Tuning>).preset,
)

/** True when `glass` has the exact values of `preset`. */
export function matchesPreset(glass: GlassTuning, preset: GlassPreset): boolean {
  const p = glassPresets[preset] as GlassTuning
  return (Object.keys(p) as (keyof GlassTuning)[]).every((k) => glass[k] === p[k])
}

/** The preset with the fewest differing values: for tunings saved before the name was kept. */
export function nearestPreset(glass: GlassTuning): GlassPreset {
  let best: GlassPreset = 'silverGlass'
  let bestDiff = Infinity
  for (const name of Object.keys(glassPresets) as GlassPreset[]) {
    const p = glassPresets[name] as GlassTuning
    const diff = (Object.keys(p) as (keyof GlassTuning)[]).filter((k) => glass[k] !== p[k]).length
    if (diff < bestDiff) {
      best = name
      bestDiff = diff
    }
  }
  return best
}

/** Keep an explicit preset name; otherwise infer it from the glass values. */
function withPreset(t: Tuning, explicit: GlassPreset | undefined): Tuning {
  return { ...t, preset: explicit && explicit in glassPresets ? explicit : nearestPreset(t.glass) }
}

/** The object-valued groups of Tuning (everything but the preset name). */
export type TuningGroup = 'glass' | 'lights' | 'env' | 'post'

type TuningStore = Tuning & {
  set: <K extends TuningGroup>(group: K, patch: Partial<Tuning[K]>) => void
  applyPreset: (name: GlassPreset) => void
  /** Replace everything (import / reset). */
  replace: (t: Tuning) => void
}

/** The plain data part of the store, for saving / exporting. */
export const pickTuning = (s: Tuning): Tuning => ({ preset: s.preset, glass: s.glass, lights: s.lights, env: s.env, post: s.post })

const initStore = (set: (p: Partial<TuningStore> | ((s: TuningStore) => Partial<TuningStore>)) => void): TuningStore => ({
  ...defaultTuning,
  set: (group, patch) => set((s) => ({ [group]: { ...(s[group] as object), ...patch } }) as Partial<Tuning>),
  applyPreset: (name) => set({ glass: glassPresets[name], preset: name }),
  // Merge so a JSON from before a field existed still yields a complete tuning.
  replace: (t) => set(pickTuning(withPreset(mergeTuning(baseTuning, t), t.preset))),
})

/**
 * Dev pages keep their own saved edits: the nav and the cube experiment want different
 * looks, and sharing one key let a dark nav tune black out the cube.
 */
export const TUNING_KEY =
  typeof window === 'undefined'
    ? 'nav-tuning'
    : window.location.pathname.startsWith('/dev/cube')
      ? 'cube-tuning'
      : window.location.pathname.startsWith('/dev/callout')
        ? 'callout-tuning'
        : 'nav-tuning'

// Dev: keep unsaved edits across reloads (localStorage). Prod: the saved JSON only.
export const useTuning = import.meta.env.DEV
  ? create<TuningStore>()(
      persist(initStore, {
        name: TUNING_KEY,
        // Bump when saved state must be discarded (v1 predates per-page keys and could hold
        // the cube page's black-backdrop preset for the nav).
        version: 3,
        migrate: (persisted, version) => (version < 3 ? {} : (persisted as Partial<Tuning>)),
        partialize: (s) => pickTuning(s),
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as DeepPartial<Tuning>
          return { ...(current as TuningStore), ...withPreset(mergeTuning(pickTuning(current as Tuning), saved), saved.preset) }
        },
      }),
    )
  : create<TuningStore>()(initStore)

declare global {
  interface Window {
    /** Dev-only handle for headless tuning scripts. */
    __navTuning?: typeof useTuning
  }
}
if (import.meta.env.DEV && typeof window !== 'undefined') window.__navTuning = useTuning

/** A stable string for keying the environment map so it re-renders when a light changes. */
export function useLightsKey() {
  const { rects, emitters, emitterScale } = useTuning((s) => s.lights)
  return JSON.stringify([emitters, emitterScale, rects])
}
