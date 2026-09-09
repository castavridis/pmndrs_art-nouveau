import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Generator } from 'maath/random'
import { Glass } from '../nav/Nav3D/Glass'
import { usePresetGlass } from '../nav/Nav3D/paletteTuning'
import { useTuning } from '../nav/Nav3D/tuning'
import { fractureRect, shardGeometry } from './shatter'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { tokens } from '../nav/tokens'
import type { PresetName } from '../nav/Nav3D/customPresets'

interface Shard {
  geometry: THREE.ExtrudeGeometry
  p: THREE.Vector3
  v: THREE.Vector3
  rot: THREE.Euler
  spin: THREE.Vector3
}

export interface ShardsProps {
  /** Slab size and depth in world units. */
  width: number
  height: number
  depth: number
  /** Where it was struck, in the slab's local x/y (world units). */
  hit: [number, number]
  preset?: PresetName
  /** Seconds until the shards have fallen and faded; `onDone` fires then. */
  life?: number
  onDone?: () => void
  /** Corner radius of the slab (px) for its falling backing. */
  radius?: number
}

const GRAVITY = -9

/**
 * The slab broken into Voronoi shards around the strike: each flies out from the hit,
 * tumbles, falls under gravity and shrinks away. One draw per shard with the shared
 * transmission pass, so a few dozen shards cost about what the slab did.
 */
export function Shards({ width, height, depth, hit, preset, life = 2.4, onDone, radius = 8 }: ShardsProps) {
  const shards = useMemo<Shard[]>(() => {
    const rng = new Generator(Math.round(hit[0] * 1000 + hit[1] * 7))
    return fractureRect(width, height, hit).map((cell) => {
      const { geometry, centroid } = shardGeometry(cell, depth)
      const dx = centroid[0] - hit[0]
      const dy = centroid[1] - hit[1]
      const d = Math.hypot(dx, dy) + 0.05
      // Impulse away from the strike, stronger close to it; a little forward (toward the camera).
      const k = (1.8 / (0.4 + d)) * (0.7 + rng.value() * 0.6)
      return {
        geometry,
        p: new THREE.Vector3(centroid[0], centroid[1], 0),
        v: new THREE.Vector3((dx / d) * k, (dy / d) * k + 0.8, 0.6 + rng.value() * 1.2),
        rot: new THREE.Euler(0, 0, 0),
        spin: new THREE.Vector3(rng.value() - 0.5, rng.value() - 0.5, rng.value() - 0.5).multiplyScalar(6 / (0.5 + d)),
      }
    })
  }, [width, height, depth, hit])
  useEffect(() => () => shards.forEach((s) => s.geometry.dispose()), [shards])

  // The slab's backing (the glass's buffer-background colour, the tone the shards refract)
  // stays one piece: it falls behind them as a single body, tilting as it goes, and fades with them.
  const live = useTuning((s) => s.glass.background)
  const presetBg = usePresetGlass(preset ?? 'silverGlass').background
  const backing = preset ? presetBg : live
  const backingGeometry = useMemo(
    () => makeRoundedRectGeometry(width * tokens.pxPerUnit, height * tokens.pxPerUnit, radius, 1),
    [width, height, radius],
  )
  useEffect(() => () => backingGeometry.dispose(), [backingGeometry])
  const backingMesh = useRef<THREE.Mesh>(null)
  // The shards fade out in place (opacity, no shrinking or regrouping) once they have flown apart.
  const refs = useRef<(THREE.Mesh | null)[]>([])
  // Wall clock, so the fade keeps pace with the banner's DOM timers even on a slow frame rate.
  const start = useRef<number | null>(null)
  const done = useRef(false)
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.1)
    if (start.current === null) start.current = performance.now()
    const t = (performance.now() - start.current) / 1000
    const fade = Math.max(0, 1 - Math.max(0, t - life * 0.35) / (life * 0.65))
    shards.forEach((s, i) => {
      const m = refs.current[i]
      if (!m) return
      const mat = m.material as THREE.Material
      mat.transparent = true
      mat.opacity = fade
      s.v.y += GRAVITY * step
      s.p.addScaledVector(s.v, step)
      s.rot.x += s.spin.x * step
      s.rot.y += s.spin.y * step
      s.rot.z += s.spin.z * step
      m.position.copy(s.p)
      m.rotation.copy(s.rot)
      m.visible = fade > 0.01
    })
    // The backing: a moment of hang, then a drop that slowly overtakes the shards, tilting away.
    const bm = backingMesh.current
    if (bm) {
      const ft = Math.max(0, t - 0.15)
      bm.position.y = -3.2 * ft * ft
      bm.position.x = 0.15 * ft
      bm.rotation.z = -0.12 * ft
      bm.rotation.x = -0.35 * ft
      ;(bm.material as THREE.Material).opacity = fade
    }
    if (t >= life && !done.current) {
      done.current = true
      onDone?.()
    }
  })
  return (
    <>
      <mesh ref={backingMesh} geometry={backingGeometry} position-z={-depth * 1.6} raycast={() => null}>
        <meshBasicMaterial color={backing} transparent opacity={1} />
      </mesh>
      {shards.map((s, i) => (
        <mesh key={i} ref={(el) => void (refs.current[i] = el)} geometry={s.geometry} raycast={() => null}>
          <Glass sampler preset={preset} />
        </mesh>
      ))}
    </>
  )
}
