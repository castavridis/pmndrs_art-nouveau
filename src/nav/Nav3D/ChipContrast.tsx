import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useNavStore, useNavStoreApi } from '../store'
import { px, tokens } from '../tokens'
import { INKS } from './dom'
import { useItemRegistry } from './items'
import { useTuning } from './tuning'

/**
 * The background luminance at which the two inks read equally well, by APCA: below it the
 * light ink has more contrast, above it the dark one does. Computed once offline with apca-w3
 * for exactly these two colours (#111111 and #f2f2ef, both Lc 50 here), so the decision is
 * APCA's own without shipping the library, which is a dev dependency.
 */
const CROSSOVER_Y = 0.305
/** A band either side of it, so a petal drifting behind the chip cannot make the label flicker. */
const HYSTERESIS = 0.04
/**
 * The background luminance each ink needs to reach APCA's targets (Lc 75 for readable text,
 * Lc 60 as the floor), again from apca-w3 for these two colours. The median of the chip is held
 * to the first, and its worst tenth to the second.
 */
const DARK_INK_NEEDS = { target: 0.5752, floor: 0.4042 } // at least this light
const LIGHT_INK_NEEDS = { target: 0.1129, floor: 0.2201 } // at most this light
/** The veil never turns the chip into a flat, opaque pill: past this, it is the tuning to fix. */
const MAX_VEIL = 0.65
/** How often to look, in frames: a few times a second is plenty for a label colour. */
const EVERY = 12
/**
 * Readings kept, about two seconds' worth. The lights move — the ray sweeps, the roam light
 * follows the pointer — so one instant can catch the chip dark and the next lit. The ink is
 * chosen from the typical reading and the veil sized for the worst, so the label neither
 * flips with the sweep nor loses the text at its brightest.
 */
const WINDOW = 10
/**
 * Resolution of the look, as a fraction of the canvas. Half, not a quarter: the band read is
 * only a dozen px tall, and at a quarter one row of it caught the chip's bevel, which set the
 * worst tenth and drove the veil to its cap for a chip that was nowhere near that dark.
 */
const SCALE = 0.5

/*
 * What the canvas shows for a value in the scene's linear buffer: the composer's ACES filmic
 * tone mapping, sRGB encoding, then the film grain, which runs on the displayed image.
 */
const aces = (x: number) => Math.min(1, Math.max(0, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)))
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSRGB = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

type Blend = 'screen' | 'overlay' | 'softLight' | 'add' | 'multiply' | 'normal'
export interface Grain {
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
function grain(c: number, n: number, g: Grain): number {
  if (g.opacity <= 0) return c
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

/** On-screen luminance for a scene-linear luminance `v`, with the grain at sample `n`. */
const shown = (v: number, n: number, g: Grain) => toLinear(grain(toSRGB(aces(v)), n, g))

/**
 * The scene-linear value that shows at `want` once graded: the least that shows at least that
 * (`atLeast`), or the most that shows at most it. `shown` rises with `v`, so a bisection finds it.
 */
function sceneValueFor(want: number, n: number, g: Grain, atLeast: boolean): number {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (shown(mid, n, g) < want) lo = mid
    else hi = mid
  }
  return atLeast ? hi : lo
}

export interface ChipContrastProps {
  /** The nav's own group, for turning an item's position into the canvas's pixels. */
  root: React.RefObject<THREE.Group | null>
  /** Hide the labels while looking, so the chip is measured and not the words on it. */
  hideText: (hidden: boolean) => void
}

/**
 * Picks the ink for the label the selection chip is sitting under, from the chip as it is
 * actually drawn.
 *
 * The chip is glass, so how light it looks depends on what it transmits — the pill behind it,
 * the lights, the environment — far more than on its own preset. The same chip reads as black
 * under one tuning and pale grey under another, which no fixed colour survives: the page ink
 * measured Lc 99 on one and 16 on the other. So every few frames the chip's region is drawn
 * once more, small and with the labels hidden, and the ink with more contrast against it wins.
 *
 * Picking the ink is not always enough: on a chip that renders mid-grey both inks land near
 * Lc 50, and glass is uneven, so part of it defeats either one. So it also sets a veil — a wash
 * over the chip in the opposite polarity, drawn under the text — at exactly the opacity needed
 * to bring the text to APCA's targets, and none at all when the chip already contrasts.
 *
 * The look draws just that region, via the camera's view offset, into a target a few dozen
 * pixels across, so the extra fragment work is negligible. It runs before the frame's own
 * render and restores everything it touches, so the frame the user sees is untouched.
 */
export function ChipContrast({ root, hideText }: ChipContrastProps) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const api = useNavStoreApi()
  const setChipInk = useNavStore((s) => s.setChipInk)
  const setChipVeil = useNavStore((s) => s.setChipVeil)
  const frame = useRef(0)
  // The veil on the chip must be out of the picture while the chip is measured, or each reading
  // would see the last correction and keep it. Looked up by name on every reading rather than
  // cached, so a replaced mesh can never leave the live one showing.
  const rt = useMemo(() => new THREE.WebGLRenderTarget(1, 1), [])
  useEffect(() => () => rt.dispose(), [rt])
  const registry = useItemRegistry()
  const at = useMemo(() => new THREE.Vector3(), [])
  const history = useRef<{ median: number; low: number; high: number }[]>([])
  // The grain is a post effect the offscreen look never sees, and at the panel's defaults it
  // darkens a light chip by about a quarter; it is modelled from the tuning instead.
  const post = useTuning((st) => st.post)
  const grainOf = useRef<Grain>({ opacity: 0, blend: 'multiply', premultiply: true })
  useEffect(() => {
    grainOf.current = { opacity: post.noise, blend: post.noiseBlend, premultiply: post.noisePremultiply }
  }, [post.noise, post.noiseBlend, post.noisePremultiply])

  useFrame(() => {
    if (++frame.current % EVERY) return
    const s = api.getState()
    const id = s.hovered ?? s.focused ?? s.active
    const el = id ? registry?.get(id) : undefined
    const rc = el?.relativeCenter.peek()
    const dims = el?.size.peek()
    const g = root.current
    if (!rc || !dims || !g) return
    // Where the item really is on the canvas: projected from the nav's own group, so it holds
    // whether the nav has a canvas to itself or rides a slot in a page-wide scene.
    g.updateWorldMatrix(true, false)
    at.set(px(rc[0]), px(rc[1]), px(tokens.pillDepth / 2)).applyMatrix4(g.matrixWorld).project(camera)
    const cx = ((at.x + 1) / 2) * size.width
    const cy = ((1 - at.y) / 2) * size.height
    // At the nav's depth one CSS px is one canvas px (the camera is calibrated to it), so the
    // item's own size stands in for its box. The middle of it, where the letters sit.
    const w = dims[0] * 0.7
    // The middle two fifths in height: clear of the chip's bevelled top and bottom edges.
    const h = dims[1] * 0.4
    const x = cx - w / 2
    const y = cy - h / 2
    const pw = Math.max(2, Math.round(w * SCALE))
    const ph = Math.max(2, Math.round(h * SCALE))
    if (rt.width !== pw || rt.height !== ph) rt.setSize(pw, ph)

    const cam = camera as THREE.PerspectiveCamera
    const veil = scene.getObjectByName('chip-veil')
    const veilWasVisible = veil?.visible ?? false
    if (veil) veil.visible = false
    hideText(true)
    const prevTarget = gl.getRenderTarget()
    cam.setViewOffset(size.width, size.height, x, y, w, h)
    gl.setRenderTarget(rt)
    gl.clear()
    gl.render(scene, cam)
    gl.setRenderTarget(prevTarget)
    cam.clearViewOffset()
    hideText(false)
    if (veil) veil.visible = veilWasVisible

    const buf = new Uint8Array(pw * ph * 4)
    gl.readRenderTargetPixels(rt, 0, 0, pw, ph, buf)
    // Scene-linear luminance of each pixel, before any grading: the space the veil blends in.
    const ys: number[] = []
    for (let i = 0; i < pw * ph; i++) ys.push((0.2126 * buf[i * 4]! + 0.7152 * buf[i * 4 + 1]! + 0.0722 * buf[i * 4 + 2]!) / 255)
    ys.sort((a, b) => a - b)
    const q = (f: number) => ys[Math.min(ys.length - 1, Math.floor(f * ys.length))]!
    // Fold this reading into the last couple of seconds'.
    const h1 = history.current
    h1.push({ median: q(0.5), low: q(0.1), high: q(0.9) })
    if (h1.length > WINDOW) h1.shift()
    const medians = h1.map((r) => r.median).sort((a, b) => a - b)
    const median = medians[medians.length >> 1]!
    const darkest = Math.min(...h1.map((r) => r.low))
    const lightest = Math.max(...h1.map((r) => r.high))
    const brightestMedian = medians[medians.length - 1]!
    const dimmestMedian = medians[0]!

    // Choose on what is actually shown: the typical reading, graded and grained.
    const gr = grainOf.current
    const current = s.chipInk
    const dark = INKS.light.ink
    const light = INKS.dark.ink
    const seen = shown(median, 0.5, gr)
    const next =
      seen > CROSSOVER_Y + HYSTERESIS ? dark : seen < CROSSOVER_Y - HYSTERESIS ? light : (current ?? light)
    if (next !== current) setChipInk(next)

    // Then how much veil it takes for that ink to read. The veil blends in the scene's linear
    // buffer, before the grading, so each target is first carried back into that space: the
    // scene value that still shows at the target once tone mapped and grained. A white veil at
    // opacity a lifts v to a + (1 - a)v, a black one lowers it to (1 - a)v. The median is held
    // to the target at the grain's midpoint, and the window's worst pixels to the floor at its
    // worst sample — its darkest for the dark ink, its brightest for the light — so the text
    // holds at the sweep's worst moment rather than its average one.
    let need: number
    if (next === dark) {
      const lift = (want: number, v: number) => (want - v) / Math.max(1e-3, 1 - v)
      need = Math.max(
        lift(sceneValueFor(DARK_INK_NEEDS.target, 0.5, gr, true), dimmestMedian),
        lift(sceneValueFor(DARK_INK_NEEDS.floor, 0.1, gr, true), darkest),
      )
    } else {
      const dim = (want: number, v: number) => (v - want) / Math.max(1e-3, v)
      need = Math.max(
        dim(sceneValueFor(LIGHT_INK_NEEDS.target, 0.5, gr, false), brightestMedian),
        dim(sceneValueFor(LIGHT_INK_NEEDS.floor, 0.9, gr, false), lightest),
      )
    }
    setChipVeil(Math.min(MAX_VEIL, Math.max(0, need)))
  })
  return null
}
