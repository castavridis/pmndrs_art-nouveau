import * as THREE from 'three'
import { Generator } from 'maath/random'

export type Polygon = [number, number][]

/**
 * Fractures a w×h rectangle (centred at the origin) into Voronoi cells. Seeds cluster around
 * `hit`, so the break is finest where the glass was struck and coarser toward the edges.
 * Cells are cut by half-plane clipping against every other seed (fine for a few dozen).
 */
export function fractureRect(w: number, h: number, hit: [number, number], count = 36, seed = 7): Polygon[] {
  const rng = new Generator(seed)
  const seeds: [number, number][] = []
  const near = Math.round(count * 0.55)
  for (let i = 0; i < near; i++) {
    // Gaussian-ish cluster around the hit, radius grows with the slab.
    const a = rng.value() * Math.PI * 2
    const r = (rng.value() + rng.value()) * 0.5 * Math.min(w, h) * 0.9
    seeds.push([clamp(hit[0] + Math.cos(a) * r, -w / 2, w / 2), clamp(hit[1] + Math.sin(a) * r, -h / 2, h / 2)])
  }
  for (let i = near; i < count; i++) seeds.push([(rng.value() - 0.5) * w, (rng.value() - 0.5) * h])
  const rect: Polygon = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ]
  const cells: Polygon[] = []
  for (let i = 0; i < seeds.length; i++) {
    let poly = rect
    const [sx, sy] = seeds[i]!
    for (let j = 0; j < seeds.length && poly.length; j++) {
      if (j === i) continue
      const [tx, ty] = seeds[j]!
      // Keep the half-plane closer to seed i: (t - s)·p <= (|t|² - |s|²) / 2
      const ax = tx - sx
      const ay = ty - sy
      const c = (tx * tx + ty * ty - sx * sx - sy * sy) / 2
      poly = clip(poly, ax, ay, c)
    }
    if (poly.length >= 3) cells.push(poly)
  }
  return cells
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Sutherland–Hodgman clip of `poly` to the half-plane ax*x + ay*y <= c. */
function clip(poly: Polygon, ax: number, ay: number, c: number): Polygon {
  const out: Polygon = []
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!
    const q = poly[(i + 1) % poly.length]!
    const dp = ax * p[0] + ay * p[1] - c
    const dq = ax * q[0] + ay * q[1] - c
    if (dp <= 0) out.push(p)
    if ((dp <= 0) !== (dq <= 0)) {
      const t = dp / (dp - dq)
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
    }
  }
  return out
}

/** A shard: an extruded cell with its centroid at the origin (so it can spin in place). */
export function shardGeometry(cell: Polygon, depth: number): { geometry: THREE.ExtrudeGeometry; centroid: [number, number] } {
  let cx = 0
  let cy = 0
  for (const [x, y] of cell) {
    cx += x
    cy += y
  }
  cx /= cell.length
  cy /= cell.length
  const shape = new THREE.Shape()
  cell.forEach(([x, y], i) => (i ? shape.lineTo(x - cx, y - cy) : shape.moveTo(x - cx, y - cy)))
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
  geometry.translate(0, 0, -depth / 2)
  return { geometry, centroid: [cx, cy] }
}
