import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import savedJson from './tuning.saved.json'
import { getPreset, presetNames, type PresetName } from './customPresets'

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
  rotation: Vec3  /** Turn the panel toward the current page's item (nav) instead of using `rotation`. */
  followActive?: boolean
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
  /**
   * A point light wandering across the canvas (0 intensity = off). `follow`: sits under the
   * pointer while it is over the page. `body`: also draw its glowing sphere through the glass.
   */
  roam: { intensity: number; color: string; speed: number; size: number; follow: boolean; /** Settle on a hovered petal or flower at its own x, y, z. */ /** `solid` uses `color`; `rainbow` cycles through the bright palette colours while the light moves. */ mode: 'solid' | 'rainbow'; /** Rainbow cycle rate in palette steps per world unit travelled. */ rainbowRate: number; hover: boolean; /** Lift off the hovered surface (world units, toward the camera) so the light glints on it instead of sitting inside. */ hoverOffset: number; body: boolean; /** Depth in world units in front of the scene (the nav's pill is at 0; the cube page's blocks reach about ±4). */ z: number }
  /**
   * A ray: a spot light anchored above the canvas whose aim follows the pointer (a slow
   * side-to-side sweep when the mouse is off the page). `cone` is the half-angle in degrees.
   */
  ray: { enabled: boolean; intensity: number; color: string; cone: number; softness: number; speed: number }
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
  /**
   * Also draw the strips inside the glass (refracted as hard lines). Off keeps only their
   * environment reflections, which read more naturally.
   */
  stripsInGlass: boolean
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

/** Petal / flower motion (the nav's falling field and the cube page's swarms). */
export interface MotionTuning {
  /** Drift speed multiplier (0 holds still). */
  speed: number
  /** Tumble rate multiplier. */
  spin: number
  /** Sideways sway multiplier (falling petals). */
  sway: number
  /** How hard the pointer pushes nearby petals away (0 = off). */
  stir: number
  /** Reach of the pointer's push, in world units. */
  stirRadius: number
}

/** `live` = the page's tuned glass (the pill's look); otherwise a preset name. */
export type MaterialChoice = PresetName | 'live'

/** Which materials the GLB parts wear, and which the petal / flower swarms draw from. */
export interface MaterialsTuning {
  /** Presets the falling petals and petal swarms are spread across (empty = whole palette). */
  petals: PresetName[]
  /** Presets the flower swarms are spread across (empty = whole palette). */
  flowers: PresetName[]
  /** nav-left / nav-right clusters. */
  clusters: MaterialChoice
  /** The loose petals spilling off the pill. */
  loosePetals: MaterialChoice
  /** Announcement flourishes. */
  flourishes: MaterialChoice
  /** Current-page indicator petal. */
  indicator: PresetName
  /** The cube page's logo prisms. */
  model: MaterialChoice
  /** Callout surfaces: the main glass (`live`), the kind's palette tint (`kind`), or a preset. */
  callout: MaterialChoice | 'kind'
}

export interface Tuning {
  /** The preset the glass was last set from (built-in or user-defined); edits keep the name. */
  preset: PresetName
  glass: GlassTuning
  motion: MotionTuning
  materials: MaterialsTuning
  lights: LightsTuning
  env: {
    intensity: number
    rotation: number
    /** Backdrop of the environment cubemap: what glass reflects where no panel is. */
    background: string
    /** Exponential depth fog in the backdrop colour; 0 disables it. */
    fog: number
    /**
     * Opacity of a translucent slab between the glass and the nav labels (black under light
     * ink, white under dark ink). Evens out what passes behind the text for legibility.
     */
    labelScrim: number
    /** Text ink on the glass: picked from the backdrop (`auto`), or forced light / dark. */
    ink: 'auto' | 'light' | 'dark'
  }
  post: {
    bloomIntensity: number
    bloomThreshold: number
    bloomSmoothing: number
    /** Bloom spread (mipmap blur radius). */
    bloomRadius: number
    /**
     * Cap on HDR brightness fed to bloom (and the display). A specular glint can reach values
     * in the hundreds; blurred by bloom that becomes a page-wide haze. ACES maps anything
     * above ~6 to white anyway, so the cap costs nothing visible.
     */
    bloomClamp: number
    aberration: number    /** Film grain over the frame: 0 is off. */
    noise: number
    /** How the grain blends: screen (lightens), overlay, soft-light, add, multiply, normal. */
    noiseBlend: 'screen' | 'overlay' | 'softLight' | 'add' | 'multiply' | 'normal'
    /** Scale the grain by the pixel's brightness (keeps blacks clean). */
    noisePremultiply: boolean
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
  roam: { intensity: 4, color: '#ffffff', speed: 0.06, size: 6, follow: true, mode: 'solid', rainbowRate: 0.35, hover: true, hoverOffset: 0.5, body: false, z: 1.2 },
  ray: { enabled: true, intensity: 12, color: '#ffffff', cone: 18, softness: 0.6, speed: 0.05 },
  luminanceScale: 0.25,
  emitters: true,
  stripsInGlass: false,
  emitterScale: 0.12,
  sweep: 0.08,
  sweepRange: 40,
  // The glint light: a spot above and (Womp z −315 → in front of) the nav, aimed at the
  // hovered nav item, else the current page's (see AimTracker / Lights.tsx).
  overhead: {
    color: '#ffffff',
    intensity: 320,
    position: { x: 0, y: 120, z: -315 },
    target: { x: 0, y: 0, z: 0 },
    angle: 12,
    penumbra: 0.85,
  },
  // Values read from the Womp inspector (pmndrs – poppies, 2026-09-07).
  rects: [
    // "Overhead Light": the large panel above the scene. Womp did not show its numbers, so
    // these are estimated from the viewport: roughly four nav widths wide, white, tilted at the nav.
    { name: 'overhead', color: '#ffffff', luminance: 6, width: 700, height: 200, position: { x: 0, y: 110, z: -315 }, rotation: { x: -80, y: 0, z: 0 }, followActive: false },
    { name: '45° top', color: '#caf543', luminance: 15, width: 98.62, height: 1.01, position: { x: 18.31, y: 38.7, z: 30.69 }, rotation: { x: -135, y: -180, z: -45 } },
    { name: '45° middle', color: '#caf543', luminance: 50, width: 144.04, height: 0.76, position: { x: -1.75, y: 14.65, z: 6.64 }, rotation: { x: -135, y: -180, z: -45 } },
    { name: '45° bottom', color: '#caf543', luminance: 15, width: 98.62, height: 0.53, position: { x: -14.04, y: -7.33, z: -9.99 }, rotation: { x: -135, y: -180, z: -45 } },
  ],
}

/** Code defaults, before anything saved from the leva panel. */
export const baseTuning: Tuning = {
  preset: 'silverGlass',
  glass: glassPresets.silverGlass,
  motion: { speed: 1, spin: 1, sway: 1, stir: 1, stirRadius: 0.8 },
  materials: {
    petals: Object.keys(palette) as PaletteName[],
    flowers: Object.keys(palette) as PaletteName[],
    clusters: 'live',
    loosePetals: 'live',
    flourishes: 'live',
    indicator: 'indicator',
    model: 'live',
    callout: 'live',
  },
  lights: defaultLights,
  env: { intensity: 0.6, rotation: 0, background: '#2a2d36', fog: 0, labelScrim: 0.35, ink: 'auto' },
  post: { bloomIntensity: 0.25, bloomThreshold: 0.85, bloomSmoothing: 0.4, bloomRadius: 0.85, bloomClamp: 6, aberration: 0.0004, noise: 0, noiseBlend: 'screen', noisePremultiply: true },
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** Merge saved values over defaults: objects recurse, arrays (the rect lights) replace whole. */
export function mergeTuning(base: Tuning, saved: DeepPartial<Tuning>): Tuning {
  const merge = <T extends object>(b: T, s: DeepPartial<T> | undefined): T => {
    if (!s) return b
    const out = { ...b } as Record<string, unknown>
    for (const [k, v] of Object.entries(s)) {
      // Fields that no longer exist in the defaults are dropped (the panel has no control for them).
      if (!(k in b)) continue
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

export type Scheme = 'light' | 'dark'
export type SchemeTunings = Record<Scheme, Tuning>

/** Code defaults for a light page: the same look over a pale backdrop. */
export const baseTuningLight: Tuning = {
  ...baseTuning,
  glass: { ...baseTuning.glass, background: '#b4b8c4' },
  env: { ...baseTuning.env, background: '#c3c6d0' },
}
export const baseSchemes: SchemeTunings = { dark: baseTuning, light: baseTuningLight }

/**
 * tuning.saved.json: `{ dark, light }` (one Tuning each); a file from before schemes existed
 * holds a single Tuning, which then applies to both.
 */
type SavedFile = Partial<Record<Scheme, DeepPartial<Tuning>>> | DeepPartial<Tuning>
const savedFile = savedJson as SavedFile
const savedFor = (scheme: Scheme): DeepPartial<Tuning> => {
  const f = savedFile as Partial<Record<Scheme, DeepPartial<Tuning>>>
  if ('dark' in f || 'light' in f) return f[scheme] ?? {}
  return savedFile as DeepPartial<Tuning>
}

/**
 * What each scheme starts from: code defaults + the saved file (written by the leva panel's
 * "save to project"). In dev, unsaved edits also persist in localStorage.
 */
export const defaultSchemes: SchemeTunings = {
  dark: withPreset(mergeTuning(baseTuning, savedFor('dark')), savedFor('dark').preset),
  light: withPreset(mergeTuning(baseTuningLight, savedFor('light')), savedFor('light').preset),
}
/** The dark scheme's defaults (the panel's initial ranges; the live values come from the store). */
export const defaultTuning: Tuning = defaultSchemes.dark

/** True when `glass` has the exact values of `preset`. */
export function matchesPreset(glass: GlassTuning, preset: PresetName): boolean {
  const p = getPreset(preset)
  if (!p) return false
  return (Object.keys(p) as (keyof GlassTuning)[]).every((k) => glass[k] === p[k])
}

/** The preset with the fewest differing values: for tunings saved before the name was kept. */
export function nearestPreset(glass: GlassTuning): PresetName {
  let best: PresetName = 'silverGlass'
  let bestDiff = Infinity
  for (const name of presetNames()) {
    const p = getPreset(name)!
    const diff = (Object.keys(p) as (keyof GlassTuning)[]).filter((k) => glass[k] !== p[k]).length
    if (diff < bestDiff) {
      best = name
      bestDiff = diff
    }
  }
  return best
}

/** Keep an explicit preset name; otherwise infer it from the glass values. */
function withPreset(t: Tuning, explicit: PresetName | undefined): Tuning {
  return { ...t, preset: explicit && getPreset(explicit) ? explicit : nearestPreset(t.glass) }
}

/** The object-valued groups of Tuning (everything but the preset name). */
export type TuningGroup = 'glass' | 'motion' | 'materials' | 'lights' | 'env' | 'post'

type TuningStore = Tuning & {
  /** Which scheme the top-level values belong to; switched by the page theme. */
  scheme: Scheme
  /** The other scheme's values, parked while inactive. */
  schemes: SchemeTunings
  set: <K extends TuningGroup>(group: K, patch: Partial<Tuning[K]>) => void
  applyPreset: (name: PresetName) => void
  /** Replace the active scheme's values (import / reset). */
  replace: (t: Tuning) => void
  /** Park the active values and load the other scheme's. */
  setScheme: (scheme: Scheme) => void
  /** Copy the active scheme's values onto the other one. */
  copyToOther: () => void
}

/** The plain data part of the store, for saving / exporting. */
export const pickTuning = (s: Tuning): Tuning => ({ preset: s.preset, glass: s.glass, motion: s.motion, materials: s.materials, lights: s.lights, env: s.env, post: s.post })

/** Both schemes, with the active one's live values: what "save to project" writes. */
export const pickSchemes = (s: TuningStore): SchemeTunings => ({ ...s.schemes, [s.scheme]: pickTuning(s) })

const initStore = (set: (p: Partial<TuningStore> | ((s: TuningStore) => Partial<TuningStore>)) => void): TuningStore => ({
  ...defaultSchemes.dark,
  scheme: 'dark',
  schemes: defaultSchemes,
  set: (group, patch) => set((s) => ({ [group]: { ...(s[group] as object), ...patch } }) as Partial<Tuning>),
  applyPreset: (name) => set({ glass: getPreset(name) ?? glassPresets.silverGlass, preset: name }),
  // Merge so a JSON from before a field existed still yields a complete tuning.
  replace: (t) => set((s) => pickTuning(withPreset(mergeTuning(baseSchemes[s.scheme], t), t.preset))),
  setScheme: (scheme) =>
    set((s) => {
      if (s.scheme === scheme) return s
      const schemes = pickSchemes(s)
      return { scheme, schemes, ...schemes[scheme] }
    }),
  copyToOther: () =>
    set((s) => {
      const other: Scheme = s.scheme === 'dark' ? 'light' : 'dark'
      return { schemes: { ...s.schemes, [other]: pickTuning(s) } }
    }),
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
        version: 4,
        // v3 held one Tuning: it becomes the dark scheme; light starts from its defaults.
        migrate: (persisted, version) =>
          version < 3 ? {} : version < 4 ? { schemes: { dark: persisted as Partial<Tuning> } } : (persisted as object),
        partialize: (s) => ({ schemes: pickSchemes(s) }),
        merge: (persisted, current) => {
          const cur = current as TuningStore
          const saved = ((persisted ?? {}) as { schemes?: Partial<Record<Scheme, DeepPartial<Tuning>>> }).schemes ?? {}
          const schemes: SchemeTunings = {
            dark: withPreset(mergeTuning(defaultSchemes.dark, saved.dark ?? {}), saved.dark?.preset),
            light: withPreset(mergeTuning(defaultSchemes.light, saved.light ?? {}), saved.light?.preset),
          }
          return { ...cur, schemes, ...schemes[cur.scheme] }
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

/** A swarm's pool of presets: the tuned list, or the whole palette when it is empty. */
export function presetPool(list: PresetName[]): PresetName[] {
  return list.length ? list : (Object.keys(palette) as PaletteName[])
}
