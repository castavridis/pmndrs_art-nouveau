import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Generator } from 'maath/random'
import { useNavStore } from '../nav/store'
import { useNavAssets } from '../nav/Nav3D/assets'
import { Glass } from '../nav/Nav3D/Glass'
import { palette, type GlassPreset, type PaletteName } from '../nav/Nav3D/tuning'

/** Petals: pale and pink like the reference render. */
const PETAL_PRESETS: PaletteName[] = ['light', 'light', 'red', 'purple', 'light']
/** Shapes: saturated palette colours. */
const SHAPE_COLOURS: PaletteName[] = ['purple', 'red', 'yellow', 'teal', 'blue', 'orange', 'green', 'light']

interface Body {
  box: THREE.Box3
  p: THREE.Vector3
  v: THREE.Vector3
  rot: THREE.Euler
  spin: THREE.Vector3
  scale: number
}

const tmp = new THREE.Object3D()

/** Bodies drifting inside boxes: slow constant velocity, tumble, bounce off the walls. */
class Swarm {
  readonly bodies: Body[]
  constructor(boxes: THREE.Box3[], count: number, seed: number, speed: number, scale: [number, number], margin: number) {
    const rng = new Generator(seed)
    const sizes = boxes.map((b) => b.getSize(new THREE.Vector3()))
    const volumes = sizes.map((s) => s.x * s.y * s.z)
    const total = volumes.reduce((a, b) => a + b, 0)
    // Distribute `count` bodies by volume (largest remainder), so small groups don't get one per box.
    const exact = volumes.map((v) => (count * v) / total)
    const alloc = exact.map(Math.floor)
    let left = count - alloc.reduce((a, b) => a + b, 0)
    exact
      .map((e, i) => [e - alloc[i]!, i] as const)
      .sort((a, b) => b[0] - a[0])
      .forEach(([, i]) => {
        if (left > 0) {
          alloc[i]!++
          left--
        }
      })
    this.bodies = []
    boxes.forEach((box, i) => {
      const n = alloc[i]!
      const inner = box.clone().expandByScalar(-margin)
      for (let k = 0; k < n; k++) {
        const r = () => rng.value()
        this.bodies.push({
          box: inner,
          p: new THREE.Vector3(
            THREE.MathUtils.lerp(inner.min.x, inner.max.x, r()),
            THREE.MathUtils.lerp(inner.min.y, inner.max.y, r()),
            THREE.MathUtils.lerp(inner.min.z, inner.max.z, r()),
          ),
          v: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(speed * (0.5 + r())),
          rot: new THREE.Euler(r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2),
          spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(1.5),
          scale: THREE.MathUtils.lerp(scale[0], scale[1], r()),
        })
      }
    })
  }

  update(m: THREE.InstancedMesh, step: number) {
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i]!
      b.p.addScaledVector(b.v, step)
      for (const axis of ['x', 'y', 'z'] as const) {
        if (b.p[axis] < b.box.min[axis]) {
          b.p[axis] = b.box.min[axis]
          b.v[axis] = Math.abs(b.v[axis])
        } else if (b.p[axis] > b.box.max[axis]) {
          b.p[axis] = b.box.max[axis]
          b.v[axis] = -Math.abs(b.v[axis])
        }
      }
      b.rot.x += b.spin.x * step
      b.rot.y += b.spin.y * step
      b.rot.z += b.spin.z * step
      tmp.position.copy(b.p)
      tmp.rotation.copy(b.rot)
      tmp.scale.setScalar(b.scale)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }
}

interface GroupProps {
  boxes: THREE.Box3[]
  geometry: THREE.BufferGeometry
  /** Glass preset (solid variant, so the interior stays bright) or a flat palette colour. */
  preset?: GlassPreset
  colour?: string
  count: number
  seed: number
  speed: number
  scale: [number, number]
  margin: number
}

function InstancedSwarm({ boxes, geometry, preset, colour, count, seed, speed, scale, margin }: GroupProps) {
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  const swarm = useMemo(() => new Swarm(boxes, count, seed, speed, scale, margin), [boxes, count, seed, speed, scale, margin])
  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    m.frustumCulled = false
    m.raycast = () => null
  }, [])
  useFrame((_, dt) => {
    if (mesh.current) swarm.update(mesh.current, reducedMotion ? 0 : Math.min(dt, 0.05))
  })
  if (swarm.bodies.length === 0) return null
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, swarm.bodies.length]}>
      {colour ? (
        <meshPhysicalMaterial color={colour} emissive={colour} emissiveIntensity={0.35} roughness={0.35} clearcoat={1} />
      ) : (
        <Glass solid preset={preset} />
      )}
    </instancedMesh>
  )
}

export interface InsideProps {
  boxes: THREE.Box3[]
  petals?: number
  shapes?: number
}

/**
 * Petals floating inside the model's blocks (spread across the palette materials), plus a
 * handful of small palette cubes and spheres like the reference render.
 */
export function Inside({ boxes, petals = 40, shapes = 8 }: InsideProps) {
  const { petalLo } = useNavAssets()
  const cube = useMemo(() => new THREE.BoxGeometry(0.32, 0.32, 0.32), [])
  const sphere = useMemo(() => new THREE.SphereGeometry(0.18, 24, 16), [])
  const per = Math.ceil(petals / PETAL_PRESETS.length)
  return (
    <>
      {PETAL_PRESETS.map((preset, i) => (
        <InstancedSwarm key={`${preset}-${i}`} boxes={boxes} geometry={petalLo} preset={preset} count={Math.min(per, petals - i * per)} seed={100 + i} speed={0.12} scale={[1.2, 2.2]} margin={0.15} />
      ))}
      {SHAPE_COLOURS.slice(0, shapes).map((name, i) => (
        <InstancedSwarm key={`shape-${name}`} boxes={boxes} geometry={i % 2 ? sphere : cube} colour={palette[name]} count={1} seed={900 + i} speed={0.08} scale={[0.8, 1.2]} margin={0.3} />
      ))}
    </>
  )
}
