import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Generator } from 'maath/random'
import { useNavStore } from '../store'
import { capturedInstance, hoverAimHandlers, pointerWorldXY, usePagePointer } from './aim'
import { useTuning, type MotionTuning } from './tuning'
import { px } from '../tokens'
import { useNavAssets } from './assets'
import { Glass } from './Glass'
import { presetPool } from './tuning'
import type { PresetName } from './customPresets'

export interface PetalFieldProps {
  count?: number
  /** Materials to spread across the petals (one instanced mesh per material). */
  presets?: PresetName[]
}


interface P {
  x: number
  y: number
  z: number
  vy: number
  sway: number
  phase: number
  rot: THREE.Euler
  spin: THREE.Vector3
  scale: number
}

const tmp = new THREE.Object3D()
const stirAt = new THREE.Vector3()

/** Simulation state for the field; a class so per-frame mutation stays out of React's sight. */
class Field {
  readonly petals: P[]
  constructor(count: number, private halfW: number, private halfH: number, seed = 2026) {
    const rng = new Generator(seed)
    this.petals = Array.from({ length: count }, () => ({
      x: (rng.value() * 2 - 1) * halfW,
      y: (rng.value() * 2 - 1) * halfH,
      z: (rng.value() * 2 - 1) * 0.35,
      vy: -(0.06 + rng.value() * 0.14),
      sway: 0.02 + rng.value() * 0.06,
      phase: rng.value() * Math.PI * 2,
      rot: new THREE.Euler(rng.value() * Math.PI * 2, rng.value() * Math.PI * 2, rng.value() * Math.PI * 2),
      spin: new THREE.Vector3(rng.value() - 0.5, rng.value() - 0.5, rng.value() - 0.5).multiplyScalar(1.2),
      scale: 0.7 + rng.value() * 0.6,
    }))
  }

  update(m: THREE.InstancedMesh, t: number, step: number, motion: MotionTuning, stir: THREE.Vector3 | null) {
    const { halfW, halfH } = this
    const held = capturedInstance(m)
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i]!
      p.y += p.vy * step * motion.speed
      p.rot.x += p.spin.x * step * motion.spin
      p.rot.y += p.spin.y * step * motion.spin
      p.rot.z += p.spin.z * step * motion.spin
      if (stir && motion.stir > 0 && i !== held) {
        // The pointer gently pushes petals within stirRadius away from it (not the one it holds).
        const dx = p.x - stir.x
        const dy = p.y - stir.y
        const d = Math.hypot(dx, dy)
        if (d < motion.stirRadius && d > 1e-4) {
          const k = (motion.stir * (1 - d / motion.stirRadius) * step) / d
          p.x += dx * k
          p.y += dy * k
        }
      }
      if (p.y < -halfH - 0.1) {
        p.y = halfH + 0.1
        p.x = (Math.random() * 2 - 1) * halfW
      }
      tmp.position.set(p.x + Math.sin(t * 0.8 + p.phase) * p.sway * motion.sway, p.y, p.z)
      tmp.rotation.copy(p.rot)
      tmp.scale.setScalar(p.scale)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }
}

/**
 * A field of instanced petals drifting down across the whole canvas, spread across the
 * palette materials (one InstancedMesh per material, so nine draw calls for the default set).
 * Each petal falls at its own speed, sways sideways, tumbles, and re-enters from the top.
 * Under reduced motion it holds still.
 */
export function PetalField({ count = 100, presets: presetsProp }: PetalFieldProps) {
  // Which materials the petals wear: the tuning's list unless the caller fixes one.
  const tuned = useTuning((s) => s.materials.petals)
  const presets = presetsProp ?? presetPool(tuned)
  const per = Math.ceil(count / presets.length)
  return (
    <>
      {presets.map((preset, i) => (
        <PetalGroup key={preset} preset={preset} count={Math.min(per, count - i * per)} seed={2026 + i * 7919} />
      ))}
    </>
  )
}

function PetalGroup({ preset, count, seed }: { preset: PresetName; count: number; seed: number }) {
  const { petalLo } = useNavAssets()
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const size = useThree((s) => s.size)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  // Canvas extents in world units (the camera is calibrated to 1 unit = pxPerUnit px at z=0).
  const halfW = px(size.width) / 2
  const halfH = px(size.height) / 2
  const field = useMemo(() => new Field(count, halfW, halfH, seed), [count, halfW, halfH, seed])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    m.frustumCulled = false
    // three caches an InstancedMesh's bounding sphere from the instances' positions at first
    // raycast and skips the mesh when the ray misses it; the petals move across the whole
    // canvas, so give it a sphere that covers the field for good.
    m.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.hypot(halfW, halfH) + 1)
  }, [halfW, halfH])

  const gl = useThree((s) => s.gl)
  usePagePointer()
  useFrame((state, dt) => {
    if (!mesh.current) return
    const motion = useTuning.getState().motion
    const stir = pointerWorldXY(gl.domElement, size.width, size.height, stirAt, mesh.current) ? stirAt : null
    field.update(mesh.current, state.clock.elapsedTime, reducedMotion ? 0 : Math.min(dt, 0.05), motion, stir)
  })

  if (count <= 0) return null
  return (
    // Hovered petals draw the roaming light to them (aim.ts); events still reach the items beneath.
    <instancedMesh ref={mesh} name={`petal field ${preset}`} args={[petalLo, undefined, count]} {...hoverAimHandlers}>
      <Glass sampler preset={preset} />
    </instancedMesh>
  )
}
