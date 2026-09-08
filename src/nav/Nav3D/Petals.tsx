import { useMemo } from 'react'
import { Float } from '@react-three/drei'
import { animated, type SpringValue } from '@react-spring/three'
import { Generator, inRect } from 'maath/random'
import { px, tokens } from '../tokens'
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
 * Loose petals from petal.glb scattered along the pill's middle segment. Positions come from
 * maath's seeded generator so a given width always produces the same layout; the seed changes
 * with the measured width, so a re-layout gives a fresh but stable scatter.
 */
export function Petals({ width, layoutWidth, count, float = true }: PetalsProps) {
  const { petal } = useNavAssets()

  const placements = useMemo(() => {
    const rng = new Generator(Math.round(layoutWidth) * 31 + count)
    const middle = Math.max(layoutWidth - tokens.pillRadius * 2 - 40, 40)
    const buf = inRect(new Float32Array(count * 2), { sides: [middle, tokens.pillHeight * 1.2] }, rng)
    return Array.from({ length: count }, (_, i) => {
      const x = buf[i * 2]!
      // Push petals to the top/bottom edge band so they read as "spilling off" the pill.
      const y = (buf[i * 2 + 1]! > 0 ? 1 : -1) * (tokens.pillHeight / 2 + 4 + rng.value() * 10)
      return {
        // Store x as a fraction of the middle segment so it can ride the width spring.
        fx: x / middle,
        y: px(y),
        z: px(tokens.pillDepth / 2 + 2 + rng.value() * 6),
        rotation: [rng.value() * 0.6 - 0.3, rng.value() * 0.6 - 0.3, rng.value() * Math.PI * 2] as [number, number, number],
        speed: 0.8 + rng.value() * 0.8,
      }
    })
  }, [layoutWidth, count])

  return (
    <>
      {placements.map((p, i) => (
        <animated.group key={i} position-x={width.to((w) => p.fx * px(Math.max(w - tokens.pillRadius * 2 - 40, 40)))} position-y={p.y} position-z={p.z}>
          <Float enabled={float} speed={p.speed} rotationIntensity={0.4} floatIntensity={0.3} floatingRange={[-0.02, 0.02]}>
            <mesh geometry={petal} rotation={p.rotation}>
              <Glass sampler />
            </mesh>
          </Float>
        </animated.group>
      ))}
    </>
  )
}
