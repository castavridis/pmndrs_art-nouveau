import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Generator } from 'maath/random'
import { useNavStore } from '../nav/store'
import { Glass } from '../nav/Nav3D/Glass'
import { palette, type GlassPreset, type PaletteName } from '../nav/Nav3D/tuning'

const PALETTE = Object.keys(palette) as PaletteName[]
/** Bottom-left → top-right. */
const DIR = new THREE.Vector3(1, 1, 0).normalize()
const tmp = new THREE.Object3D()

interface Body {
  p: THREE.Vector3
  v: number
  rot: THREE.Euler
  spin: THREE.Vector3
  scale: number
  sway: number
  phase: number
}

/**
 * Bodies travelling along the 45° diagonal, from bottom-left to top-right, wrapping back
 * once they leave the top or right edge of `bounds`. Seeded, so layouts are stable.
 */
class Drift {
  readonly bodies: Body[]
  constructor(
    private readonly bounds: THREE.Box3,
    count: number,
    seed: number,
    speed: number,
    scale: [number, number],
    spin: number,
  ) {
    const rng = new Generator(seed)
    const r = () => rng.value()
    this.bodies = Array.from({ length: count }, () => ({
      p: new THREE.Vector3(
        THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, r()),
        THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, r()),
        THREE.MathUtils.lerp(bounds.min.z, bounds.max.z, r()),
      ),
      v: speed * (0.5 + r()),
      rot: new THREE.Euler(r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2),
      spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(spin),
      scale: THREE.MathUtils.lerp(scale[0], scale[1], r()),
      sway: 0.02 + r() * 0.05,
      phase: r() * Math.PI * 2,
    }))
  }

  update(m: THREE.InstancedMesh, t: number, step: number) {
    const b = this.bounds
    for (let i = 0; i < this.bodies.length; i++) {
      const o = this.bodies[i]!
      o.p.addScaledVector(DIR, o.v * step)
      o.rot.x += o.spin.x * step
      o.rot.y += o.spin.y * step
      o.rot.z += o.spin.z * step
      // Left through the top or right edge → re-enter along the bottom or left edge.
      if (o.p.x > b.max.x || o.p.y > b.max.y) {
        if (Math.random() < 0.5) {
          o.p.x = b.min.x
          o.p.y = THREE.MathUtils.lerp(b.min.y, b.max.y, Math.random())
        } else {
          o.p.y = b.min.y
          o.p.x = THREE.MathUtils.lerp(b.min.x, b.max.x, Math.random())
        }
      }
      // Sway perpendicular to the travel direction.
      const s = Math.sin(t * 0.9 + o.phase) * o.sway
      tmp.position.set(o.p.x - s, o.p.y + s, o.p.z)
      tmp.rotation.copy(o.rot)
      tmp.scale.setScalar(o.scale)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }
}

export interface DiagonalFieldProps {
  geometry: THREE.BufferGeometry
  /** Volume the bodies travel through (world units). */
  bounds: THREE.Box3
  count?: number
  /** Units per second along the diagonal. */
  speed?: number
  scale?: [number, number]
  spin?: number
  /** One preset, or random palette colours per body group. */
  preset?: GlassPreset | 'palette'
  seed?: number
}

/** Instanced bodies drifting bottom-left → top-right; one draw call per colour group. */
export function DiagonalField({
  geometry,
  bounds,
  count = 60,
  speed = 0.6,
  scale = [1, 1.8],
  spin = 1,
  preset = 'palette',
  seed = 7,
}: DiagonalFieldProps) {
  const groups = useMemo(() => {
    if (preset !== 'palette') return [{ preset, count }]
    const rng = new Generator(seed)
    const tally = new Map<PaletteName, number>()
    for (let i = 0; i < count; i++) {
      const p = PALETTE[Math.floor(rng.value() * PALETTE.length)]!
      tally.set(p, (tally.get(p) ?? 0) + 1)
    }
    return [...tally].map(([p, n]) => ({ preset: p as GlassPreset, count: n }))
  }, [preset, count, seed])
  return (
    <>
      {groups.map((g, i) => (
        <Group
          key={g.preset}
          geometry={geometry}
          bounds={bounds}
          count={g.count}
          seed={seed + i * 101}
          speed={speed}
          scale={scale}
          spin={spin}
          preset={g.preset}
        />
      ))}
    </>
  )
}

function Group({
  geometry,
  bounds,
  count,
  seed,
  speed,
  scale,
  spin,
  preset,
}: Required<Omit<DiagonalFieldProps, 'preset' | 'seed'>> & { preset: GlassPreset; seed: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  const drift = useMemo(
    () => new Drift(bounds, count, seed, speed, scale, spin),
    [bounds, count, seed, speed, scale, spin],
  )
  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    m.frustumCulled = false
    m.raycast = () => null
  }, [])
  useFrame((state, dt) => {
    if (mesh.current)
      drift.update(mesh.current, state.clock.elapsedTime, reducedMotion ? 0 : Math.min(dt, 0.05))
  })
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]}>
      <Glass solid preset={preset} />
    </instancedMesh>
  )
}
