import { capturedInstance, hoverAimHandlers, pointerWorldXY, usePagePointer } from '../nav/Nav3D/aim'
import { useTuning, type MotionTuning } from '../nav/Nav3D/tuning'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Generator } from 'maath/random'
import { useNavStore } from '../nav/store'
import { useNavAssets } from '../nav/Nav3D/assets'
import { useFlower } from './flowerAssets'
import { Glass } from '../nav/Nav3D/Glass'
import { palette, type GlassPreset, type PaletteName } from '../nav/Nav3D/tuning'

const PALETTE = Object.keys(palette) as PaletteName[]

/** Split `count` petals over the palette at random (seeded), one instanced group per colour. */
function randomSplit(count: number, seed: number): { preset: PaletteName; count: number }[] {
  const rng = new Generator(seed)
  const tally = new Map<PaletteName, number>()
  for (let i = 0; i < count; i++) {
    const preset = PALETTE[Math.floor(rng.value() * PALETTE.length)]!
    tally.set(preset, (tally.get(preset) ?? 0) + 1)
  }
  return [...tally].map(([preset, n]) => ({ preset, count: n }))
}

interface Body {
  box: THREE.Box3
  p: THREE.Vector3
  v: THREE.Vector3
  rot: THREE.Euler
  spin: THREE.Vector3
  scale: number
}

const tmp = new THREE.Object3D()
const stirAt = new THREE.Vector3()

/** Bodies drifting inside boxes: slow constant velocity, tumble, bounce off the walls. */
class Swarm {
  readonly bodies: Body[]
  constructor(
    boxes: THREE.Box3[],
    count: number,
    seed: number,
    speed: number,
    scale: [number, number],
    margin: number,
    spin = 1.5,
  ) {
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
          v: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5)
            .normalize()
            .multiplyScalar(speed * (0.5 + r())),
          rot: new THREE.Euler(r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2),
          spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(spin),
          scale: THREE.MathUtils.lerp(scale[0], scale[1], r()),
        })
      }
    })
  }

  update(m: THREE.InstancedMesh, step: number, motion: MotionTuning, stir: THREE.Vector3 | null) {
    const held = capturedInstance(m)
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i]!
      b.p.addScaledVector(b.v, step * motion.speed)
      if (stir && motion.stir > 0 && i !== held) {
        // The pointer (at the canvas plane) nudges bodies within stirRadius away in x/y; the
        // body it is holding (hoverAim) stays put so the hover does not chase it away.
        const dx = b.p.x - stir.x
        const dy = b.p.y - stir.y
        const d = Math.hypot(dx, dy)
        if (d < motion.stirRadius && d > 1e-4) {
          const k = (motion.stir * (1 - d / motion.stirRadius) * step) / d
          b.p.x += dx * k
          b.p.y += dy * k
        }
      }
      for (const axis of ['x', 'y', 'z'] as const) {
        if (b.p[axis] < b.box.min[axis]) {
          b.p[axis] = b.box.min[axis]
          b.v[axis] = Math.abs(b.v[axis])
        } else if (b.p[axis] > b.box.max[axis]) {
          b.p[axis] = b.box.max[axis]
          b.v[axis] = -Math.abs(b.v[axis])
        }
      }
      b.rot.x += b.spin.x * step * motion.spin
      b.rot.y += b.spin.y * step * motion.spin
      b.rot.z += b.spin.z * step * motion.spin
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
  /** Glass preset (solid variant, so the interior stays bright). */
  preset: GlassPreset
  /** Name prefix for the mesh (hit debug): e.g. "petal inside". */
  label: string
  /** Restrict to one box (index) instead of spreading by volume. */
  boxIndex?: number
  count: number
  seed: number
  speed: number
  scale: [number, number]
  margin: number
  /** Tumble rate (rad/s scale). */
  spin?: number
}

function InstancedSwarm({
  boxes,
  geometry,
  preset,
  label,
  boxIndex,
  count,
  seed,
  speed,
  scale,
  margin,
  spin,
}: GroupProps) {
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  const swarm = useMemo(
    () =>
      new Swarm(
        boxIndex === undefined ? boxes : [boxes[boxIndex % boxes.length]!],
        count,
        seed,
        speed,
        scale,
        margin,
        spin,
      ),
    [boxes, boxIndex, count, seed, speed, scale, margin, spin],
  )
  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    m.frustumCulled = false
    // Fixed bounding sphere over the swarm's volume (see PetalField): the cached one would
    // only cover where the bodies were at the first raycast.
    const all = new THREE.Box3()
    for (const b of boxes) all.union(b)
    const sphere = all.getBoundingSphere(new THREE.Sphere())
    sphere.radius += 1.5 // bodies are scaled, and flowers are wide
    m.boundingSphere = sphere
  }, [boxes])
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  usePagePointer()
  useFrame((_, dt) => {
    if (!mesh.current) return
    const motion = useTuning.getState().motion
    const stir = pointerWorldXY(gl.domElement, size.width, size.height, stirAt) ? stirAt : null
    swarm.update(mesh.current, reducedMotion ? 0 : Math.min(dt, 0.05), motion, stir)
  })
  if (swarm.bodies.length === 0) return null
  return (
    <instancedMesh ref={mesh} name={`${label} ${preset}`} args={[geometry, undefined, swarm.bodies.length]} {...hoverAimHandlers}>
      <Glass solid preset={preset} />
    </instancedMesh>
  )
}

export interface InsideProps {
  boxes: THREE.Box3[]
  petals?: number
}

/** Petals in random palette colours floating inside the model's blocks. */
export function Inside({ boxes, petals = 40 }: InsideProps) {
  const { petalLo } = useNavAssets()
  const groups = useMemo(() => randomSplit(petals, 11), [petals])
  return (
    <>
      {groups.map((g, i) => (
        <InstancedSwarm
          label="petal inside"
          key={g.preset}
          boxes={boxes}
          geometry={petalLo}
          preset={g.preset}
          count={g.count}
          seed={100 + i}
          speed={0.12}
          scale={[1.2, 2.2]}
          margin={0.15}
        />
      ))}
    </>
  )
}

export interface OutsideProps {
  /** The model's overall bounds; petals roam a volume around it. */
  bounds: THREE.Box3
  petals?: number
}

/** Petals in random palette colours drifting in the space around the model. */
export function Outside({ bounds, petals = 60 }: OutsideProps) {
  const { petalLo } = useNavAssets()
  const volume = useMemo(() => {
    const size = bounds.getSize(new THREE.Vector3())
    // Wider than tall so petals fill the viewport's sides; shallow so they stay near the model.
    return [bounds.clone().expandByVector(new THREE.Vector3(size.x * 0.9, size.y * 0.35, 1.5))]
  }, [bounds])
  const groups = useMemo(() => randomSplit(petals, 23), [petals])
  return (
    <>
      {groups.map((g, i) => (
        <InstancedSwarm
          label="petal outside"
          key={g.preset}
          boxes={volume}
          geometry={petalLo}
          preset={g.preset}
          count={g.count}
          seed={500 + i}
          speed={0.08}
          scale={[1, 2]}
          margin={0}
        />
      ))}
    </>
  )
}

export interface FlowersProps {
  boxes: THREE.Box3[]
  bounds: THREE.Box3
  inside?: number
  outside?: number
}

/**
 * Blossoms from flower.glb in random palette colours: a few inside the blocks, more around
 * the model. The blossom is ~4.8 units wide natively, so it is scaled to a fraction of a block.
 */
export function Flowers({ boxes, bounds, inside = 6, outside = 10 }: FlowersProps) {
  const flower = useFlower()
  const around = useMemo(() => {
    const size = bounds.getSize(new THREE.Vector3())
    return [bounds.clone().expandByVector(new THREE.Vector3(size.x * 0.9, size.y * 0.35, 1.5))]
  }, [bounds])
  const inGroups = useMemo(() => randomSplit(inside, 31), [inside])
  const outGroups = useMemo(() => randomSplit(outside, 47), [outside])
  return (
    <>
      {inGroups.map((g, i) => (
        <InstancedSwarm
          label="flower inside"
          key={`in-${g.preset}`}
          boxes={boxes}
          geometry={flower}
          preset={g.preset}
          count={g.count}
          seed={700 + i}
          speed={0.05}
          scale={[0.16, 0.26]}
          margin={0.5}
          spin={0.4}
        />
      ))}
      {outGroups.map((g, i) => (
        <InstancedSwarm
          label="flower outside"
          key={`out-${g.preset}`}
          boxes={around}
          geometry={flower}
          preset={g.preset}
          count={g.count}
          seed={800 + i}
          speed={0.04}
          scale={[0.18, 0.34]}
          margin={0}
          spin={0.4}
        />
      ))}
    </>
  )
}
