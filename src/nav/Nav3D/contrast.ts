import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { VanillaComponent } from '@react-three/uikit'
import { INKS } from './dom'
import { px } from '../tokens'
import { useTuning } from './tuning'
import { PROBE_MASK, withLayerMask } from './layers'
import { useLcReadings, type LcReading } from './lcStore'
import type { ContrastReading } from '../types'

export type { ContrastReading }

/**
 * Measured contrast for text on glass.
 *
 * Glass has no colour of its own to key an ink to. How light it looks depends on what it
 * transmits — the pill behind it, the lights, the environment, the page under a transparent
 * canvas — far more than on its preset: the same chip rendered black under one tuning and pale
 * grey under another, and the page ink scored APCA Lc 99 on one and 16 on the other. So nothing
 * guesses from the tuning any more. Every piece of text on glass registers the region it sits
 * on, and the canvas that draws that glass measures it as drawn:
 *
 * - Every few frames the scene is rendered once more, at half resolution, through the probe's
 *   layer mask: the glass and what is behind it, without the text or the contrast aids laid
 *   over it (layers.ts). One render serves every region on the canvas.
 * - Each region's pixels are read back and graded the way the canvas shows them — the
 *   composer's ACES tone mapping, sRGB, the film grain, and the page behind wherever the canvas
 *   is transparent — then kept for a couple of seconds, because the lights move.
 * - The ink with more contrast against the typical reading wins, with a band either side of
 *   the crossover so a petal drifting behind a word cannot make it flicker.
 * - A region can also ask for a veil: a wash over its glass in the polarity opposite the ink,
 *   at exactly the opacity that brings the text to APCA's targets (the selection chip does).
 *
 * Text registers wherever it lives. In the canvas, a region is a function giving its box in
 * canvas px (the nav's labels, projected from the layout). In the page, it is the element
 * itself, and what is measured is the line boxes of its text, not its padding. Both need the
 * scope of the canvas that draws their glass: a canvas makes its own unless given one, and
 * whoever owns both a canvas and the DOM laid over it (a banner, the bento page) creates the
 * scope and hands it to both.
 */

/**
 * The background luminance (APCA's Y) at which the two inks read equally well: below it the
 * light ink has more contrast, above it the dark one does. Computed offline with apca-w3 for
 * exactly these two colours (#111111 and #f2f2ef, both Lc 50 here), so the decision is APCA's
 * own without shipping the library, which is a dev dependency.
 */
const CROSSOVER_Y = 0.305
/** A band either side of it, so the choice holds while the reading wanders across it. */
const HYSTERESIS = 0.04
/**
 * The background Y each ink needs to reach APCA's targets (Lc 75 for readable text, Lc 60 as
 * the floor), again from apca-w3 for these two colours. The typical reading is held to the
 * first by a veil, and the worst tenth to the second.
 */
const DARK_INK_NEEDS = { target: 0.5752, floor: 0.4042 } // at least this light
const LIGHT_INK_NEEDS = { target: 0.1129, floor: 0.2201 } // at most this light
/** The veil never turns glass into a flat, opaque sheet: past this, it is the tuning to fix. */
const MAX_VEIL = 0.65
/** How often to look, in frames: a few times a second is plenty for a text colour. */
const EVERY = 12
/**
 * Readings kept per region, about two seconds' worth. The ray sweeps and the roam light
 * follows the pointer, so one instant can catch the glass dark and the next lit. The ink is
 * chosen from the typical reading and the veil sized for the worst, so the text neither flips
 * with the sweep nor loses its contrast at the brightest moment.
 */
const WINDOW = 10
/**
 * Resolution of the look, as a fraction of the canvas. Half, not a quarter: a nav label's band
 * is only a dozen px tall, and at a quarter one row of it caught the chip's bevel, which set
 * the worst tenth and drove the veil to its cap for a chip nowhere near that dark.
 */
const SCALE = 0.5

export type InkScheme = keyof typeof INKS
export type InkSet = (typeof INKS)[InkScheme]

/** A box in canvas CSS px, origin at the canvas's top left. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * What a region measures: an element in the page (the line boxes of its text), or a function
 * returning boxes in canvas px, or null while there is nothing to measure.
 */
export type ContrastSource = RefObject<Element | null> | (() => Rect | Rect[] | null)


interface Sample {
  median: number
  low: number
  high: number
}

/**
 * One piece of text's region. A class so the hook can reconfigure it through methods on every
 * render without re-registering, and so the probe's bookkeeping lives next to it.
 */
class Region {
  source: ContrastSource | null = null
  veil = false
  key: unknown = undefined
  name: string | undefined = undefined
  publish: (r: ContrastReading) => void = () => {}
  // The probe's state for this region.
  seenKey: unknown = undefined
  history: Sample[] = []
  scheme: InkScheme | null = null

  configure(source: ContrastSource, veil: boolean, key: unknown, name: string | undefined) {
    this.source = source
    this.veil = veil
    this.key = key
    this.name = name
  }

  connect(publish: (r: ContrastReading) => void) {
    this.publish = publish
  }
}

export interface ContrastScope {
  regions: Set<Region>
}

export const createContrastScope = (): ContrastScope => ({ regions: new Set() })

/** The scope of the canvas behind whatever is below it; see the note at the top. */
export const ContrastScopeContext = createContext<ContrastScope | null>(null)

/** A scope for a component that owns a canvas and the DOM over it; stable for its lifetime. */
export function useContrastScope(): ContrastScope {
  return useState(createContrastScope)[0]
}

/**
 * A uikit element's box in canvas px, for a region source: its layout centre and size, placed
 * by `root`'s world matrix at depth `z` (CSS px) and projected, keeping the middle `band` of it
 * (where the glyphs are). Projected rather than assumed from the canvas centre, so it holds
 * whether the text has a canvas to itself or rides a slot in a page-wide scene. At the text's
 * depth one CSS px is one canvas px (the camera is calibrated to it), so the element's own size
 * stands in for its box.
 */
export function uikitRect(
  el: Pick<VanillaComponent, 'relativeCenter' | 'size'> | null | undefined,
  root: THREE.Object3D | null,
  z: number,
  camera: THREE.Camera,
  canvas: { width: number; height: number },
  band: readonly [number, number],
  at = new THREE.Vector3(),
): Rect | null {
  const rc = el?.relativeCenter.peek()
  const dims = el?.size.peek()
  if (!rc || !dims || !root || dims[0] <= 0) return null
  root.updateWorldMatrix(true, false)
  at.set(px(rc[0]), px(rc[1]), px(z)).applyMatrix4(root.matrixWorld).project(camera)
  const w = dims[0] * band[0]
  const h = dims[1] * band[1]
  return { x: ((at.x + 1) / 2) * canvas.width - w / 2, y: ((1 - at.y) / 2) * canvas.height - h / 2, w, h }
}

export interface ContrastOptions {
  /** Also size a veil for this region (the caller draws it, under the text). */
  veil?: boolean
  /**
   * Changing this starts the region's history afresh: the glass behind it has changed in kind
   * (the chip arrived under a label, or left it), so the old readings describe other glass.
   */
  key?: unknown
  /** Label for the dev panel's legibility readout. */
  name?: string
  /** The scope to register with, when not the one in context. */
  scope?: ContrastScope | null
  enabled?: boolean
}

/**
 * Registers `source` with the canvas that draws the glass behind it and returns the latest
 * reading, or null until the first one arrives (or when disabled).
 */
export function useContrast(source: ContrastSource, options: ContrastOptions = {}): ContrastReading | null {
  const { veil = false, key, name, enabled = true } = options
  const context = useContext(ContrastScopeContext)
  const scope = options.scope ?? context
  const region = useState(() => new Region())[0]
  const [reading, setReading] = useState<ContrastReading | null>(null)
  useLayoutEffect(() => {
    region.configure(source, veil, key, name)
  })
  useEffect(() => {
    if (!scope || !enabled) return
    region.connect((r) => setReading((old) => (old && old.scheme === r.scheme && Math.abs(old.veil - r.veil) < 0.01 ? old : r)))
    scope.regions.add(region)
    return () => {
      scope.regions.delete(region)
      region.connect(() => {})
    }
  }, [scope, region, enabled])
  return enabled ? reading : null
}

/**
 * The ink set for text on the glass behind `source`, as measured; `fallback` until the first
 * reading (and on the server, and in the vector fallback, where nothing is measured).
 */
export function useMeasuredInk(source: ContrastSource, fallback: InkSet, options: ContrastOptions = {}): InkSet {
  const reading = useContrast(source, options)
  return reading ? INKS[reading.scheme] : fallback
}

/*
 * What the canvas shows for a value in the scene's linear buffer: the composer's ACES filmic
 * tone mapping, sRGB encoding, then the film grain, which runs on the displayed image. Results
 * are in APCA's own luminance (sRGB channels raised to 2.4), the space its thresholds are in.
 */
const aces = (x: number) => Math.min(1, Math.max(0, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)))
const toSRGB = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
const apcaY = (srgb: number) => Math.max(0, srgb) ** 2.4

type Blend = 'screen' | 'overlay' | 'softLight' | 'add' | 'multiply' | 'normal'
interface Grade {
  /** The composer runs (tone mapping happens either way; the grain only with it). */
  post: boolean
  opacity: number
  blend: Blend
  premultiply: boolean
}

/**
 * postprocessing's noise effect on one displayed channel `c`, for a noise sample `n` in [0, 1]:
 * the effect colour is `n`, or `c·n` when premultiplied, blended in at `opacity` with the
 * chosen blend function (noise.frag and the blend functions of postprocessing 6). Every mode
 * rises with `n`, so n = 0.1 and n = 0.9 bound the darkest and brightest a pixel gets.
 */
function grain(c: number, n: number, g: Grade): number {
  if (!g.post || g.opacity <= 0) return c
  const e = g.premultiply ? Math.min(c * n, 1) : n
  let b: number
  switch (g.blend) {
    case 'multiply':
      b = c * e
      break
    case 'screen':
      b = 1 - (1 - c) * (1 - e)
      break
    case 'add':
      b = Math.min(c + e, 1)
      break
    case 'overlay':
      b = c < 0.5 ? 2 * c * e : 1 - 2 * (1 - c) * (1 - e)
      break
    case 'softLight': {
      const d = c <= 0.25 ? ((16 * c - 12) * c + 4) * c : Math.sqrt(c)
      b = e <= 0.5 ? c - (1 - 2 * e) * c * (1 - c) : c + (2 * e - 1) * (d - c)
      break
    }
    default:
      b = e
  }
  return c + (b - c) * g.opacity
}

/** On-screen luminance (APCA Y) for a scene-linear luminance `v`, with the grain at sample `n`. */
const shown = (v: number, n: number, g: Grade) => apcaY(grain(toSRGB(aces(v)), n, g))

/**
 * The scene-linear value that shows at `want` once graded: the least that shows at least that
 * (`atLeast`), or the most that shows at most it. `shown` rises with `v`, so a bisection finds it.
 */
function sceneValueFor(want: number, n: number, g: Grade, atLeast: boolean): number {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (shown(mid, n, g) < want) lo = mid
    else hi = mid
  }
  return atLeast ? hi : lo
}

/**
 * `sceneValueFor` at the grain's midpoint as a table, for the probe's per-pixel use: 1024 steps
 * of displayed Y, rebuilt when the grade changes.
 */
let inverseTable: Float32Array | null = null
let inverseFor: Grade | null = null
function sceneValueAt(want: number, g: Grade): number {
  if (inverseFor !== g || !inverseTable) {
    inverseTable = new Float32Array(1025)
    for (let i = 0; i <= 1024; i++) inverseTable[i] = sceneValueFor(i / 1024, 0.5, g, true)
    inverseFor = g
  }
  return inverseTable[Math.round(Math.min(1, Math.max(0, want)) * 1024)]!
}

/** The ink's own APCA Y, for the dev readout. */
const inkY = (hex: string) => [1, 3, 5].reduce((y, i, k) => y + [0.2126729, 0.7151522, 0.072175][k]! * apcaY(parseInt(hex.slice(i, i + 2), 16) / 255), 0)

/** APCA Lc (0.0.98G-4g constants) of text Y against background Y, as a magnitude. */
function lc(txt: number, bg: number): number {
  const clamp = (y: number) => (y > 0.022 ? y : y + (0.022 - y) ** 1.414)
  const t = clamp(txt)
  const b = clamp(bg)
  if (Math.abs(b - t) < 0.0005) return 0
  const s = b > t ? (b ** 0.56 - t ** 0.57) * 1.14 : (b ** 0.65 - t ** 0.62) * 1.14
  if (Math.abs(s) < 0.1) return 0
  return Math.abs((s > 0 ? s - 0.027 : s + 0.027) * 100)
}

/** The page colour behind a transparent canvas: the first opaque background up its ancestors. */
function pageBehind(el: Element): number {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const m = /rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[,/ ]+([\d.]+))?/.exec(getComputedStyle(n).backgroundColor)
    if (m && (m[4] === undefined || Number(m[4]) > 0.5)) {
      return 0.2126729 * apcaY(Number(m[1]) / 255) + 0.7151522 * apcaY(Number(m[2]) / 255) + 0.072175 * apcaY(Number(m[3]) / 255)
    }
  }
  return 1
}

const walkerFilter = { acceptNode: (n: Node) => (n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) }

/** The line boxes of an element's text, in canvas px; the element's own box if it has none. */
function textRects(el: Element, canvas: DOMRect): Rect[] {
  const out: Rect[] = []
  const range = document.createRange()
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, walkerFilter)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    range.selectNodeContents(n)
    for (const r of Array.from(range.getClientRects())) {
      if (r.width > 1 && r.height > 1) out.push({ x: r.x - canvas.x, y: r.y - canvas.y, w: r.width, h: r.height })
    }
  }
  if (!out.length) {
    const r = el.getBoundingClientRect()
    if (r.width > 1 && r.height > 1) out.push({ x: r.x - canvas.x, y: r.y - canvas.y, w: r.width, h: r.height })
  }
  return out
}

function rectsOf(source: ContrastSource, canvas: DOMRect): Rect[] {
  if (typeof source === 'function') {
    const r = source()
    return r ? (Array.isArray(r) ? r : [r]) : []
  }
  return source.current ? textRects(source.current, canvas) : []
}

/**
 * Fold one reading into the region's history, choose its ink, and size its veil if it has one.
 * The veil blends in the scene's linear buffer, before the grading, so each target is first
 * carried back into that space: the scene value that still shows at the target once graded.
 * A white veil at opacity a lifts v to a + (1 − a)v, a black one lowers it to (1 − a)v. The
 * typical reading is held to the target at the grain's midpoint, and the window's worst pixels
 * to the floor at its worst sample — the darkest for the dark ink, the brightest for the light.
 */
function decide(region: Region, sample: Sample, g: Grade): { reading: ContrastReading; lc: LcReading } {
  if (region.key !== region.seenKey) {
    region.seenKey = region.key
    region.history = []
    region.scheme = null
  }
  const h = region.history
  h.push(sample)
  if (h.length > WINDOW) h.shift()
  const medians = h.map((r) => r.median).sort((a, b) => a - b)
  const median = medians[medians.length >> 1]!
  const darkest = Math.min(...h.map((r) => r.low))
  const lightest = Math.max(...h.map((r) => r.high))
  const dimmestMedian = medians[0]!
  const brightestMedian = medians[medians.length - 1]!

  const seen = shown(median, 0.5, g)
  const scheme: InkScheme =
    seen > CROSSOVER_Y + HYSTERESIS ? 'light' : seen < CROSSOVER_Y - HYSTERESIS ? 'dark' : (region.scheme ?? (seen >= CROSSOVER_Y ? 'light' : 'dark'))
  region.scheme = scheme

  let veil = 0
  if (region.veil) {
    if (scheme === 'light') {
      const lift = (want: number, v: number) => (want - v) / Math.max(1e-3, 1 - v)
      veil = Math.max(
        lift(sceneValueFor(DARK_INK_NEEDS.target, 0.5, g, true), dimmestMedian),
        lift(sceneValueFor(DARK_INK_NEEDS.floor, 0.1, g, true), darkest),
      )
    } else {
      const dim = (want: number, v: number) => (v - want) / Math.max(1e-3, v)
      veil = Math.max(
        dim(sceneValueFor(LIGHT_INK_NEEDS.target, 0.5, g, false), brightestMedian),
        dim(sceneValueFor(LIGHT_INK_NEEDS.floor, 0.9, g, false), lightest),
      )
    }
    veil = Math.min(MAX_VEIL, Math.max(0, veil))
  }

  // What the text actually gets, veil included: for the panel's readout.
  const veiled = (v: number) => (scheme === 'light' ? veil + (1 - veil) * v : (1 - veil) * v)
  const t = inkY(INKS[scheme].ink)
  const worst = scheme === 'light' ? shown(veiled(sample.low), 0.1, g) : shown(veiled(sample.high), 0.9, g)
  return {
    reading: { scheme, veil },
    lc: { median: Math.round(lc(t, shown(veiled(sample.median), 0.5, g))), worst: Math.round(lc(t, worst)) },
  }
}

/**
 * Measures every region registered in `scope` against this canvas's scene. Mounted once per
 * canvas (NavCanvas). It runs before the frame's own render and restores everything it
 * touches — render target, layer mask — so the frame the viewer sees is untouched.
 */
export function ContrastProbe({ scope, postprocessing }: { scope: ContrastScope; postprocessing: boolean }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const frame = useRef(0)
  const rt = useMemo(() => new THREE.WebGLRenderTarget(1, 1), [])
  useEffect(() => () => rt.dispose(), [rt])
  // The grain is a post effect the offscreen look never sees; it is modelled from the tuning.
  const post = useTuning((s) => s.post)
  const grade = useRef<Grade>({ post: postprocessing, opacity: 0, blend: 'multiply', premultiply: true })
  useEffect(() => {
    grade.current = { post: postprocessing, opacity: post.noise, blend: post.noiseBlend, premultiply: post.noisePremultiply }
  }, [postprocessing, post.noise, post.noiseBlend, post.noisePremultiply])
  const publishLc = useLcReadings((s) => s.publish)

  useFrame(() => {
    if (++frame.current % EVERY || !scope.regions.size) return
    const canvas = gl.domElement.getBoundingClientRect()
    const jobs: [Region, Rect[]][] = []
    for (const region of scope.regions) {
      if (!region.source) continue
      const rects = rectsOf(region.source, canvas)
      if (rects.length) jobs.push([region, rects])
    }
    if (!jobs.length) return

    const w = Math.max(1, Math.round(size.width * SCALE))
    const h = Math.max(1, Math.round(size.height * SCALE))
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h)
    const prevTarget = gl.getRenderTarget()
    gl.setRenderTarget(rt)
    gl.clear()
    withLayerMask(camera, PROBE_MASK, () => gl.render(scene, camera))
    gl.setRenderTarget(prevTarget)

    const g = grade.current
    // Where the canvas is transparent the viewer sees the page, so those pixels count as the
    // page's colour: graded, blended by alpha, and carried back into scene values. Blending
    // onto the cleared target leaves colour premultiplied, so it is divided back out first.
    const page = pageBehind(gl.domElement)
    const lcOut: Record<string, LcReading> = {}
    for (const [region, rects] of jobs) {
      const ys: number[] = []
      for (const r of rects) {
        const x0 = Math.max(0, Math.floor(r.x * SCALE))
        const y0 = Math.max(0, Math.floor(r.y * SCALE))
        const x1 = Math.min(w, Math.ceil((r.x + r.w) * SCALE))
        const y1 = Math.min(h, Math.ceil((r.y + r.h) * SCALE))
        const rw = x1 - x0
        const rh = y1 - y0
        if (rw <= 0 || rh <= 0) continue
        const buf = new Uint8Array(rw * rh * 4)
        // GL rows run bottom-up.
        gl.readRenderTargetPixels(rt, x0, h - y1, rw, rh, buf)
        for (let i = 0; i < rw * rh; i++) {
          const v = (0.2126 * buf[i * 4]! + 0.7152 * buf[i * 4 + 1]! + 0.0722 * buf[i * 4 + 2]!) / 255
          const a = buf[i * 4 + 3]! / 255
          ys.push(a > 0.99 ? v : sceneValueAt(a * shown(a > 0.004 ? v / a : 0, 0.5, g) + (1 - a) * page, g))
        }
      }
      if (!ys.length) continue
      ys.sort((a, b) => a - b)
      const q = (f: number) => ys[Math.min(ys.length - 1, Math.floor(f * ys.length))]!
      const { reading, lc: l } = decide(region, { median: q(0.5), low: q(0.1), high: q(0.9) }, g)
      region.publish(reading)
      if (import.meta.env.DEV && region.name) lcOut[region.name] = l
    }
    if (import.meta.env.DEV && Object.keys(lcOut).length) publishLc(lcOut)
  })
  return null
}
