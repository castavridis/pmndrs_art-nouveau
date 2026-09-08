import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Generator } from 'maath/random'
import { useNavStore } from '../store'
import { px } from '../tokens'
import { useNavAssets } from './assets'
import { Glass } from './Glass'

export interface PetalFieldProps {
  count?: number
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

/** Simulation state for the field; a class so per-frame mutation stays out of React's sight. */
class Field {
  readonly petals: P[]
  constructor(count: number, private halfW: number, private halfH: number) {
    const rng = new Generator(2026)
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

  update(m: THREE.InstancedMesh, t: number, step: number) {
    const { halfW, halfH } = this
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i]!
      p.y += p.vy * step
      p.rot.x += p.spin.x * step
      p.rot.y += p.spin.y * step
      p.rot.z += p.spin.z * step
      if (p.y < -halfH - 0.1) {
        p.y = halfH + 0.1
        p.x = (Math.random() * 2 - 1) * halfW
      }
      tmp.position.set(p.x + Math.sin(t * 0.8 + p.phase) * p.sway, p.y, p.z)
      tmp.rotation.copy(p.rot)
      tmp.scale.setScalar(p.scale)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }
}

export function PetalField({ count = 100 }: PetalFieldProps) {
  const { petalLo } = useNavAssets()
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const size = useThree((s) => s.size)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  // Canvas extents in world units (the camera is calibrated to 1 unit = pxPerUnit px at z=0).
  const halfW = px(size.width) / 2
  const halfH = px(size.height) / 2

  const field = useMemo(() => new Field(count, halfW, halfH), [count, halfW, halfH])

  useLayoutEffect(() => {
    const m = mesh.current
    m.frustumCulled = false
    // Decorative: never intercept pointer events meant for the items beneath.
    m.raycast = () => null
  }, [])

  useFrame((state, dt) => {
    field.update(mesh.current, state.clock.elapsedTime, reducedMotion ? 0 : Math.min(dt, 0.05))
  })

  return (
    <instancedMesh ref={mesh} args={[petalLo, undefined, count]}>
      <Glass sampler />
    </instancedMesh>
  )
}
