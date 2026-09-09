import { useMemo } from 'react'
import { Float } from '@react-three/drei'
import { animated, type SpringValue } from '@react-spring/three'
import { useNavStore } from '../store'
import { hoverAimHandlers } from './aim'
import { px } from '../tokens'
import { middleSegment, petalPlacements } from '../petalLayout'
import { Glass } from './Glass'
import { useNavAssets } from './assets'

export interface PetalsProps {
  /** Pill width in CSS px (spring), for following the ends while animating. */
  width: SpringValue<number>
  /** Measured (settled) width in CSS px; placement is re-seeded when it changes. */
  layoutWidth: number
  /** Number of petals, already clamped to 1..3 by the caller. */
  count: number
  /** Turn off the idle float (prefers-reduced-motion). */
  float?: boolean
}

/**
 * Loose petals from petal.glb scattered along the pill's middle segment. Placement is the
 * shared, seeded `petalPlacements` (also used by the DOM fallback's traced petals), so the
 * 2D → 3D cross-fade keeps every petal in place.
 */
export function Petals({ width, layoutWidth, count, float = true }: PetalsProps) {
  const { petal } = useNavAssets()

  // Seed from the DOM pill's width when Nav2D has measured it (the uikit row measures a few
  // px differently), so the traced petals and these sit in the same places.
  const domWidth = useNavStore((s) => s.pillWidth)
  const seedWidth = domWidth ?? layoutWidth
  const placements = useMemo(() => petalPlacements(seedWidth, count), [seedWidth, count])

  return (
    <>
      {placements.map((p, i) => (
        <animated.group key={i} position-x={width.to((w) => p.fx * px(middleSegment(w)))} position-y={px(p.y)} position-z={px(p.z)}>
          <Float enabled={float} speed={p.speed} rotationIntensity={0.4} floatIntensity={0.3} floatingRange={[-0.02, 0.02]}>
            <mesh geometry={petal} rotation={p.rotation} {...hoverAimHandlers}>
              <Glass sampler />
            </mesh>
          </Float>
        </animated.group>
      ))}
    </>
  )
}
