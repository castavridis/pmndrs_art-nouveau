import { Generator, inRect } from 'maath/random'
import { tokens } from './tokens'

export interface PetalPlacement {
  /** x as a fraction (-0.5..0.5) of the pill's middle segment, so it can ride the width spring. */
  fx: number
  /** y offset from the pill's centre line in CSS px (up is positive). */
  y: number
  /** z offset from the pill's front face in CSS px. */
  z: number
  /** Euler XYZ in radians; the 2D fallback uses only z. */
  rotation: [number, number, number]
  speed: number
}

/** Length in px of the pill's straight middle segment for a given pill width. */
export const middleSegment = (pillWidth: number) => Math.max(pillWidth - tokens.pillRadius * 2 - 40, 40)

/**
 * Where the loose petals sit on a pill of `layoutWidth` px. Seeded by the width and the
 * count, so the DOM fallback and the 3D scene compute the same scatter independently and the
 * cross-fade between them does not move a petal.
 */
export function petalPlacements(layoutWidth: number, count: number): PetalPlacement[] {
  const rng = new Generator(Math.round(layoutWidth) * 31 + count)
  const middle = middleSegment(layoutWidth)
  const buf = inRect(new Float32Array(count * 2), { sides: [middle, tokens.pillHeight * 1.2] }, rng)
  return Array.from({ length: count }, (_, i) => {
    const x = buf[i * 2]!
    // Push petals to the top/bottom edge band so they read as "spilling off" the pill.
    const y = (buf[i * 2 + 1]! > 0 ? 1 : -1) * (tokens.pillHeight / 2 + 4 + rng.value() * 10)
    return {
      fx: x / middle,
      y,
      z: tokens.pillDepth / 2 + 2 + rng.value() * 6,
      rotation: [rng.value() * 0.6 - 0.3, rng.value() * 0.6 - 0.3, rng.value() * Math.PI * 2],
      speed: 0.8 + rng.value() * 0.8,
    }
  })
}
