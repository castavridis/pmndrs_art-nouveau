import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { animated, type SpringValue } from '@react-spring/three'
import { px, tokens } from '../tokens'
import { useGlassProps } from './materials'

export interface ClustersProps {
  /** Pill width in CSS px (spring). Clusters sit at ±width/2, scale is always 1. */
  width: SpringValue<number>
}

/**
 * Flower clusters pinned to the pill caps. Position-only: never scaled with width.
 * Until left.glb / right.glb are exported and run through gltfjsx (generated/), these are
 * procedural placeholders with roughly the reference silhouette.
 */
export function Clusters({ width }: ClustersProps) {
  const left = width.to((w) => -px(w) / 2)
  const right = width.to((w) => px(w) / 2)
  return (
    <>
      <animated.group position-x={left}>
        <LeftCluster />
      </animated.group>
      <animated.group position-x={right}>
        <RightCluster />
      </animated.group>
    </>
  )
}

const petalGeometry = new THREE.SphereGeometry(0.5, 24, 16)

function Flower({ radius, petals = 5, rotation = 0, children }: { radius: number; petals?: number; rotation?: number; children?: ReactNode }) {
  const glass = useGlassProps()
  const items = useMemo(
    () =>
      Array.from({ length: petals }, (_, i) => {
        const a = rotation + (i / petals) * Math.PI * 2
        return { a, x: Math.cos(a) * radius * 0.8, y: Math.sin(a) * radius * 0.8 }
      }),
    [petals, radius, rotation],
  )
  return (
    <group>
      {items.map(({ a, x, y }, i) => (
        <mesh key={i} geometry={petalGeometry} position={[x, y, 0]} rotation={[0, 0, a]} scale={[radius * 1.6, radius * 0.9, radius * 0.45]}>
          <MeshTransmissionMaterial {...glass} transmissionSampler />
        </mesh>
      ))}
      <mesh geometry={petalGeometry} scale={radius * 0.35}>
        <meshStandardMaterial color="#fff6e0" roughness={0.4} />
      </mesh>
      {children}
    </group>
  )
}

const h = px(tokens.pillHeight)

function LeftCluster() {
  return (
    <group position={[-h * 0.45, h * 0.15, 0.02]}>
      <Flower radius={h * 0.5} rotation={0.3} />
      <group position={[h * 0.85, h * 0.8, -0.02]}>
        <Flower radius={h * 0.36} rotation={-0.4} />
      </group>
      <group position={[-h * 0.4, -h * 0.75, 0.01]}>
        <Flower radius={h * 0.3} rotation={0.8} />
      </group>
    </group>
  )
}

function RightCluster() {
  const glass = useGlassProps()
  return (
    <group position={[-0.05, -0.02, 0.02]}>
      <group position={[h * 0.55, -h * 0.85, 0]}>
        <Flower radius={h * 0.5} rotation={1.1} />
      </group>
      {/* tendril: a thin torus arc curling over the top-right cap */}
      <mesh position={[-h * 0.4, h * 0.55, -0.03]} rotation={[0, 0, 0.6]}>
        <torusGeometry args={[h * 0.7, h * 0.05, 8, 32, Math.PI * 1.1]} />
        <MeshTransmissionMaterial {...glass} transmissionSampler />
      </mesh>
    </group>
  )
}
