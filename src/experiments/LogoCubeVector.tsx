import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Generator } from 'maath/random'
import { tokens } from '../nav/tokens'
import fallback from '../nav/assets/fallback/manifest.json'
import logoOutline from '../nav/assets/fallback/outline/logo-cube.svg'
import petalOutline from '../nav/assets/fallback/outline/petal.svg'
import flowerOutline from '../nav/assets/fallback/outline/flower.svg'
import { makeLogoGeometry } from './logoBlocks'
import { useCubeScene } from './cubeScene'
import { useMeasure } from './useMeasure'

/** Camera distance and field of view of the cube page (LogoCubeScene / NavCanvas). */
const CAMERA_Z = 26
const FOV = 22

interface Sprite {
  x: number
  y: number
  scale: number
  rotation: number
}

/** Seeded scatter of `count` sprites inside the xy footprint of the given boxes. */
function scatter(boxes: THREE.Box3[], count: number, scale: [number, number], margin: number, seed: number): Sprite[] {
  const rng = new Generator(seed)
  const out: Sprite[] = []
  if (boxes.length === 0) return out
  for (let i = 0; i < count; i++) {
    const b = boxes[Math.floor(rng.value() * boxes.length)]!
    const w = b.max.x - b.min.x - margin * 2
    const h = b.max.y - b.min.y - margin * 2
    out.push({
      x: b.min.x + margin + rng.value() * Math.max(w, 0),
      y: b.min.y + margin + rng.value() * Math.max(h, 0),
      scale: scale[0] + rng.value() * (scale[1] - scale[0]),
      rotation: rng.value() * 360,
    })
  }
  return out
}

/**
 * Vector mode for the cube page: the traced logo outline with traced petals and flowers
 * scattered where the 3D swarms live (inside the blocks, and around the model unless
 * "inside only"). Sized like the 3D view: the perspective camera at CAMERA_Z sees a fixed
 * height in world units, so 1 unit maps to viewportHeight / that.
 */
export function LogoCubeVector({ visible }: { visible: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const size = useMeasure(ref, { width: 1200, height: 800 })
  const scene = useCubeScene()
  const { boxes, bounds } = useMemo(() => {
    const { geometry, boxes } = makeLogoGeometry()
    const bounds = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position as THREE.BufferAttribute)
    geometry.dispose()
    return { boxes, bounds }
  }, [])
  const around = useMemo(() => {
    const s = bounds.getSize(new THREE.Vector3())
    return [bounds.clone().expandByVector(new THREE.Vector3(s.x * 0.9, s.y * 0.35, 0))]
  }, [bounds])

  // World → screen: the visible height at the blocks' front face (nearer than z=0, so a
  // little larger on screen than the origin plane), in units.
  const visibleUnits = 2 * (CAMERA_Z - bounds.max.z) * Math.tan((FOV * Math.PI) / 360)
  const k = size.height / visibleUnits // px per world unit on screen
  const toX = (x: number) => size.width / 2 + x * k
  const toY = (y: number) => size.height / 2 - y * k
  // Traced SVGs are at tokens.pxPerUnit px per unit.
  const r = k / tokens.pxPerUnit

  const petalsIn = useMemo(() => scatter(boxes, scene.petalsInside, [1.2, 2.2], 0.15, 100), [boxes, scene.petalsInside])
  const petalsOut = useMemo(
    () => (scene.insideOnly ? [] : scatter(around, scene.petalsOutside, [1, 2], 0, 500)),
    [around, scene.insideOnly, scene.petalsOutside],
  )
  const flowersIn = useMemo(() => scatter(boxes, scene.flowersInside, [0.16, 0.26], 0.5, 700), [boxes, scene.flowersInside])
  const flowersOut = useMemo(
    () => (scene.insideOnly ? [] : scatter(around, scene.flowersOutside, [0.18, 0.34], 0, 800)),
    [around, scene.insideOnly, scene.flowersOutside],
  )

  const L = fallback['logo-cube']
  const P = fallback.petal
  const F = fallback.flower
  const sprite = (src: string, m: { width: number; height: number; originX: number; originY: number }, s: Sprite, i: number) => (
    <img
      key={i}
      src={src}
      data-outline=""
      alt=""
      aria-hidden="true"
      width={m.width * r * s.scale}
      height={m.height * r * s.scale}
      style={{
        position: 'absolute',
        left: toX(s.x) - m.originX * r * s.scale,
        top: toY(s.y) - m.originY * r * s.scale,
        transform: `rotate(${s.rotation}deg)`,
      }}
    />
  )
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 600ms ease',
      }}
    >
      <img
        src={logoOutline}
        data-outline=""
        alt=""
        width={L.width * r}
        height={L.height * r}
        style={{ position: 'absolute', left: toX(0) - L.originX * r, top: toY(0) - L.originY * r }}
      />
      {petalsOut.map((s, i) => sprite(petalOutline, P, s, i))}
      {flowersOut.map((s, i) => sprite(flowerOutline, F, s, i))}
      {petalsIn.map((s, i) => sprite(petalOutline, P, s, i))}
      {flowersIn.map((s, i) => sprite(flowerOutline, F, s, i))}
    </div>
  )
}
