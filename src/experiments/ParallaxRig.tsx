import { useRef, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { damp } from 'maath/easing'
import type { Pointer } from './parallax'

export interface ParallaxRigProps {
  pointer: RefObject<Pointer>
  /** Max tilt in radians. */
  tilt?: number
  /** Extra sideways travel (world units) per unit of depth, for layered parallax. */
  shift?: number
  /** Depth of this layer: 0 = surface, 1 = icon floating above it. */
  depth?: number
  children: ReactNode
}

/**
 * Inside the canvas: tilts its children toward the pointer and shifts them by `depth`, so
 * layers at different depths move by different amounts (the parallax). Critically damped.
 */
export function ParallaxRig({
  pointer,
  tilt = 0.09,
  shift = 0.12,
  depth = 0,
  children,
}: ParallaxRigProps) {
  const group = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    const { x, y } = pointer.current
    const g = group.current
    damp(g.rotation, 'y', x * tilt, 0.18, dt)
    damp(g.rotation, 'x', -y * tilt, 0.18, dt)
    damp(g.position, 'x', x * shift * depth, 0.18, dt)
    damp(g.position, 'y', -y * shift * depth, 0.18, dt)
  })
  return <group ref={group}>{children}</group>
}
