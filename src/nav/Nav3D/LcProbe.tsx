import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { APCAcontrast, sRGBtoY } from 'apca-w3'
import { useLcReadings, type LcReading } from './lcStore'

export interface ProbeRegion {
  name: string
  /** Region in canvas CSS px (origin top-left of the canvas). */
  x: number
  y: number
  w: number
  h: number
}

export interface LcProbeProps {
  /** Text colour (hex) the regions are measured against. */
  ink: string
  /** The regions to sample, recomputed each probe. */
  regions: () => ProbeRegion[]
  /** Hide/show whatever draws the text itself, so only the backdrop is sampled. */
  hideText?: (hidden: boolean) => void
  /** Frames between probes. */
  every?: number
}

/** Half-resolution offscreen render for the probe. */
const SCALE = 0.5

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
/** Approximate what the canvas shows: ACES filmic tone mapping, then sRGB encoding. */
const aces = (x: number) => Math.min(1, Math.max(0, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)))
const toSRGB = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

/**
 * Dev-only legibility probe: every `every` frames the scene is rendered once more, at half
 * resolution and with the text hidden, and the pixels behind each region are read back and
 * scored with APCA against the ink. Readings go to `useLcReadings` (the panel shows them).
 * The offscreen render skips the composer, so values are close to, not identical with, the
 * offline check (scripts/dev/apca.mjs).
 */
export default function LcProbe({ ink, regions, hideText, every = 20 }: LcProbeProps) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const publish = useLcReadings((s) => s.publish)
  const frame = useRef(0)
  const rt = useMemo(
    () => new THREE.WebGLRenderTarget(Math.max(1, Math.round(size.width * SCALE)), Math.max(1, Math.round(size.height * SCALE))),
    [size.width, size.height],
  )
  useEffect(() => () => rt.dispose(), [rt])
  const yInk = sRGBtoY(hexToRgb(ink))

  useFrame(() => {
    if (++frame.current % every) return
    const list = regions()
    if (!list.length) return
    hideText?.(true)
    const prevTarget = gl.getRenderTarget()
    gl.setRenderTarget(rt)
    gl.clear()
    gl.render(scene, camera)
    gl.setRenderTarget(prevTarget)
    hideText?.(false)

    const out: Record<string, LcReading> = {}
    const px = new Uint8Array(4)
    for (const r of list) {
      const x0 = Math.max(0, Math.floor(r.x * SCALE))
      const y0 = Math.max(0, Math.floor(r.y * SCALE))
      const w = Math.min(rt.width - x0, Math.ceil(r.w * SCALE))
      const h = Math.min(rt.height - y0, Math.ceil(r.h * SCALE))
      if (w <= 0 || h <= 0) continue
      const buf = new Uint8Array(w * h * 4)
      // GL rows run bottom-up.
      gl.readRenderTargetPixels(rt, x0, rt.height - y0 - h, w, h, buf)
      const ys: number[] = []
      for (let i = 0; i < w * h; i++) {
        px[0] = buf[i * 4]!
        px[1] = buf[i * 4 + 1]!
        px[2] = buf[i * 4 + 2]!
        // The target holds linear light; the canvas shows it tone mapped and sRGB encoded.
        ys.push(sRGBtoY([toSRGB(aces(px[0] / 255)), toSRGB(aces(px[1] / 255)), toSRGB(aces(px[2] / 255))]))
      }
      ys.sort((a, b) => a - b)
      const q = (f: number) => ys[Math.min(ys.length - 1, Math.floor(f * ys.length))]!
      const lc = (yBg: number) => Math.abs(Number(APCAcontrast(yInk, yBg)))
      const worst = yInk > q(0.5) ? lc(q(0.9)) : lc(q(0.1))
      out[r.name] = { median: Math.round(lc(q(0.5))), worst: Math.round(worst) }
    }
    publish(out)
  }, 2)
  return null
}
