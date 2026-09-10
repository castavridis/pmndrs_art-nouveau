import { hoverAim, hoverAimHandlers, pointerWorldXY, usePagePointer } from '../nav/Nav3D/aim'
import { useTuning, type MotionTuning } from '../nav/Nav3D/tuning'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Generator } from 'maath/random'
import { useNavStore } from '../nav/store'
import { useNavAssets } from '../nav/Nav3D/assets'
import { useFlower } from './flowerAssets'
import { Glass } from '../nav/Nav3D/Glass'
import { presetPool } from '../nav/Nav3D/tuning'
import type { PresetName } from '../nav/Nav3D/customPresets'


/**
 * Which preset draws each body, seeded: preset → the indices of the bodies it draws. Kept apart
 * from the bodies themselves, so a change of pool (a theme switch swaps the whole tuning, pools
 * included) repaints the swarm instead of rebuilding it from its seed.
 */
function assignPresets(count: number, seed: number, pool: PresetName[]): [PresetName, number[]][] {
  const rng = new Generator(seed)
  const groups = new Map<PresetName, number[]>()
  for (let i = 0; i < count; i++) {
    const preset = pool[Math.floor(rng.value() * pool.length)]!
    const list = groups.get(preset)
    if (list) list.push(i)
    else groups.set(preset, [i])
  }
  return [...groups]
}

interface Body {
  box: THREE.Box3
  p: THREE.Vector3
  v: THREE.Vector3
  rot: THREE.Euler
  spin: THREE.Vector3
  scale: number
  /** A click's shove: added to the drift and dying away quickly (motion.burstDecay). */
  burst: THREE.Vector3
  burstSpin: THREE.Vector3
}

const tmp = new THREE.Object3D()
const stirAt = new THREE.Vector3()
const near = new THREE.Vector3()
const away = new THREE.Vector3()
/** How much of a shove survives hitting a wall. */
const RESTITUTION = 0.75

/**
 * Bodies drifting inside boxes: slow constant velocity, tumble, bounce off the walls. One swarm
 * per volume; the instanced meshes that draw it (one per preset) each take a share of its bodies.
 */
class Swarm {
  readonly bodies: Body[]
  /** Covers every box, for the meshes' bounding spheres. */
  readonly sphere: THREE.Sphere
  /** Corner to corner across every box: a click's shove reaches this far, so it takes them all. */
  readonly reach: number
  /** The meshes drawing this swarm, with the body behind each of their instances. */
  readonly meshes = new Map<THREE.Object3D, number[]>()

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
          burst: new THREE.Vector3(),
          burstSpin: new THREE.Vector3(),
        })
      }
    })
    const all = new THREE.Box3()
    for (const b of boxes) all.union(b)
    this.reach = all.getSize(new THREE.Vector3()).length()
    this.sphere = all.getBoundingSphere(new THREE.Sphere())
    this.sphere.radius += 1.5 // bodies are scaled, and flowers are wide
  }

  /** The body the pointer is holding (aim.ts), which the stir leaves where it is; -1 if none. */
  private held(): number {
    if (!hoverAim.active || !hoverAim.mesh || hoverAim.instanceId === null) return -1
    return this.meshes.get(hoverAim.mesh)?.[hoverAim.instanceId] ?? -1
  }

  step(step: number, motion: MotionTuning, stir: THREE.Vector3 | null) {
    const held = this.held()
    const decay = Math.exp(-motion.burstDecay * step)
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i]!
      b.p.addScaledVector(b.v, step * motion.speed).addScaledVector(b.burst, step)
      b.burst.multiplyScalar(decay)
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
      // Off the walls: the drift reflects whole, a shove loses some of itself to the wall.
      for (const axis of ['x', 'y', 'z'] as const) {
        if (b.p[axis] < b.box.min[axis]) {
          b.p[axis] = b.box.min[axis]
          b.v[axis] = Math.abs(b.v[axis])
          b.burst[axis] = Math.abs(b.burst[axis]) * RESTITUTION
        } else if (b.p[axis] > b.box.max[axis]) {
          b.p[axis] = b.box.max[axis]
          b.v[axis] = -Math.abs(b.v[axis])
          b.burst[axis] = -Math.abs(b.burst[axis]) * RESTITUTION
        }
      }
      b.rot.x += (b.spin.x * motion.spin + b.burstSpin.x) * step
      b.rot.y += (b.spin.y * motion.spin + b.burstSpin.y) * step
      b.rot.z += (b.spin.z * motion.spin + b.burstSpin.z) * step
      b.burstSpin.multiplyScalar(decay)
    }
  }

  /**
   * Shove every body in the swarm straight away from the pointer's ray and set it tumbling:
   * the reach spans the whole volume, so nothing sits out a click, but the nearer a body is the
   * harder it goes — from the full strength at the pointer to a third of it at the far corner.
   * `ray` is in the swarm's own space.
   */
  kick(ray: THREE.Ray, strength: number) {
    for (const b of this.bodies) {
      ray.closestPointToPoint(b.p, near)
      away.subVectors(b.p, near)
      const d = away.length()
      if (d < 1e-4) away.randomDirection()
      else away.divideScalar(d)
      const f = Math.max(0, 1 - d / this.reach)
      const k = strength * (0.35 + 0.65 * f)
      b.burst.addScaledVector(away, k)
      b.burstSpin.add(away.randomDirection().multiplyScalar(k * 4))
    }
  }

  /** Writes the bodies in `indices` into `mesh`'s instances, in that order. */
  write(mesh: THREE.InstancedMesh, indices: number[]) {
    for (let i = 0; i < indices.length; i++) {
      const b = this.bodies[indices[i]!]!
      tmp.position.copy(b.p)
      tmp.rotation.copy(b.rot)
      tmp.scale.setScalar(b.scale)
      tmp.updateMatrix()
      mesh.setMatrixAt(i, tmp.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }
}

interface FieldProps {
  boxes: THREE.Box3[]
  geometry: THREE.BufferGeometry
  /** Name prefix for the meshes (hit debug): e.g. "petal inside". */
  label: string
  count: number
  /** Seeds where the bodies start and how they move. */
  seed: number
  /** Seeds which preset draws which body. */
  paintSeed: number
  pool: PresetName[]
  speed: number
  scale: [number, number]
  margin: number
  /** Tumble rate (rad/s scale). */
  spin?: number
}

/**
 * One volume's swarm, drawn by one instanced mesh per preset in the pool.
 *
 * The bodies depend only on the volume, the count and the seed; the pool only decides which mesh
 * draws which body. So a theme switch, which swaps the pools with the rest of the tuning, repaints
 * the swarm where it is rather than rebuilding it from its seed.
 *
 * A click shoves every body violently away from the pointer (motion.burst): the bodies
 * ricochet off the walls of their volume and settle back into their drift within a second or so.
 * A drag is the orbit controls', so only a press that stays put counts.
 */
function SwarmField({ boxes, geometry, label, count, seed, paintSeed, pool, speed, scale, margin, spin }: FieldProps) {
  // Keyed on the scale's two numbers, not the array: callers pass it inline, so the array is new
  // on every render, and any re-render (a theme switch re-renders every swarm) rebuilt the
  // swarm from its seed, which was the reset.
  const [minScale, maxScale] = scale
  const swarm = useMemo(
    () => new Swarm(boxes, count, seed, speed, [minScale, maxScale], margin, spin),
    [boxes, count, seed, speed, minScale, maxScale, margin, spin],
  )
  const groups = useMemo(() => assignPresets(count, paintSeed, presetPool(pool)), [count, paintSeed, pool])
  const group = useRef<THREE.Group>(null)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const get = useThree((s) => s.get)
  usePagePointer()
  // Before the meshes draw (they write at the default priority). Negative, so R3F keeps rendering.
  useFrame((_, dt) => {
    const motion = useTuning.getState().motion
    const stir = pointerWorldXY(gl.domElement, size.width, size.height, stirAt, group.current ?? undefined) ? stirAt : null
    swarm.step(reducedMotion ? 0 : Math.min(dt, 0.05), motion, stir)
  }, -1)

  useEffect(() => {
    if (reducedMotion) return
    const canvas = gl.domElement
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const inverse = new THREE.Matrix4()
    let down: { x: number; y: number; t: number } | null = null
    const press = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() }
    }
    const release = (e: PointerEvent) => {
      const d = down
      down = null
      const g = group.current
      if (!d || !g || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 500) return
      const motion = useTuning.getState().motion
      if (motion.burst <= 0) return
      const rect = canvas.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, get().camera)
      g.updateWorldMatrix(true, false)
      swarm.kick(raycaster.ray.applyMatrix4(inverse.copy(g.matrixWorld).invert()), motion.burst)
    }
    canvas.addEventListener('pointerdown', press)
    canvas.addEventListener('pointerup', release)
    return () => {
      canvas.removeEventListener('pointerdown', press)
      canvas.removeEventListener('pointerup', release)
    }
  }, [gl, get, swarm, reducedMotion])

  return (
    <group ref={group}>
      {groups.map(([preset, indices]) => (
        <SwarmMesh key={preset} swarm={swarm} indices={indices} geometry={geometry} preset={preset} label={label} />
      ))}
    </group>
  )
}

/** One preset's share of a swarm. */
function SwarmMesh({
  swarm,
  indices,
  geometry,
  preset,
  label,
}: {
  swarm: Swarm
  indices: number[]
  geometry: THREE.BufferGeometry
  preset: PresetName
  label: string
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    // Fixed bounding sphere over the swarm's volume (see PetalField): the cached one would only
    // cover where the bodies were at the first raycast.
    m.frustumCulled = false
    m.boundingSphere = swarm.sphere
    swarm.meshes.set(m, indices)
    return () => void swarm.meshes.delete(m)
  }, [swarm, indices])
  useFrame(() => {
    if (mesh.current) swarm.write(mesh.current, indices)
  })
  return (
    <instancedMesh ref={mesh} name={`${label} ${preset}`} args={[geometry, undefined, indices.length]} {...hoverAimHandlers}>
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
  const pool = useTuning((s) => s.materials.petals)
  return (
    <SwarmField
      label="petal inside"
      boxes={boxes}
      geometry={petalLo}
      count={petals}
      seed={100}
      paintSeed={11}
      pool={pool}
      speed={0.12}
      scale={[1.2, 2.2]}
      margin={0.15}
    />
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
  const pool = useTuning((s) => s.materials.petals)
  return (
    <SwarmField
      label="petal outside"
      boxes={volume}
      geometry={petalLo}
      count={petals}
      seed={500}
      paintSeed={23}
      pool={pool}
      speed={0.08}
      scale={[1, 2]}
      margin={0}
    />
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
  const pool = useTuning((s) => s.materials.flowers)
  return (
    <>
      <SwarmField
        label="flower inside"
        boxes={boxes}
        geometry={flower}
        count={inside}
        seed={700}
        paintSeed={31}
        pool={pool}
        speed={0.05}
        scale={[0.16, 0.26]}
        margin={0.5}
        spin={0.4}
      />
      <SwarmField
        label="flower outside"
        boxes={around}
        geometry={flower}
        count={outside}
        seed={800}
        paintSeed={47}
        pool={pool}
        speed={0.04}
        scale={[0.18, 0.34]}
        margin={0}
        spin={0.4}
      />
    </>
  )
}
