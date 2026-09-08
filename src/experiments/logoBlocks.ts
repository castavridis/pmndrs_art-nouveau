import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { px } from '../nav/tokens'

/**
 * The pmndrs mark as prisms, measured from "logo cubed.glb" (px, model space, y up):
 * three 256 px squares and one L-shaped piece wrapping the centre square, all 806 px deep
 * with a ~15 px bevel. Regenerate the numbers with scratchpad components/bevel scripts if
 * the export changes. Coordinates are absolute like the export; `CENTRE` recentres them.
 */
export interface Block {
  name: string
  /** Outline in px, counter-clockwise, corners rounded by `BEVEL`. */
  outline: [number, number][]
  /** Axis-aligned volumes (px) that lie fully inside the outline, for placing things inside. */
  volumes: [[number, number], [number, number]][]
}

export const DEPTH = [-401.1, 405.3] as const
/** Edge bevel in px. 0 = sharp boxes; the export has ~15, 4 is a soft catch-light edge. */
export const BEVEL = 4
export const CENTRE: [number, number, number] = [4.2, 587.0, 2.1]

export const LOGO_BLOCKS: Block[] = [
  {
    name: 'left',
    outline: [
      [-397.2, 469.1],
      [-141.6, 469.1],
      [-141.6, 724.7],
      [-397.2, 724.7],
    ],
    volumes: [
      [
        [-397.2, 469.1],
        [-141.6, 724.7],
      ],
    ],
  },
  {
    name: 'centre',
    outline: [
      [-113.7, 468.7],
      [142.6, 468.7],
      [142.6, 725.1],
      [-113.7, 725.1],
    ],
    volumes: [
      [
        [-113.7, 468.7],
        [142.6, 725.1],
      ],
    ],
  },
  {
    name: 'bottom',
    outline: [
      [-112.9, 185.8],
      [141.7, 185.8],
      [141.7, 440.4],
      [-112.9, 440.4],
    ],
    volumes: [
      [
        [-112.9, 185.8],
        [141.7, 440.4],
      ],
    ],
  },
  {
    // Top bar + right column around the centre square (same ~28 px gap as elsewhere).
    name: 'L',
    outline: [
      [-113.1, 753.4],
      [171.0, 753.4],
      [171.0, 469.4],
      [405.6, 469.4],
      [405.6, 988.1],
      [-113.1, 988.1],
    ],
    volumes: [
      [
        [-113.1, 753.4],
        [405.6, 988.1],
      ],
      [
        [171.0, 469.4],
        [405.6, 753.4],
      ],
    ],
  },
]

/** Signed area (>0 for counter-clockwise). */
const signedArea = (pts: [number, number][]) =>
  pts.reduce((a, [x0, y0], i) => {
    const [x1, y1] = pts[(i + 1) % pts.length]!
    return a + (x0 * y1 - x1 * y0)
  }, 0) / 2

/** Offset a rectilinear polygon inward by d (edges move inward; right-angle corners stay exact). */
function inset(points: [number, number][], d: number): [number, number][] {
  const n = points.length
  const ccw = signedArea(points) > 0
  const v = (i: number) => new THREE.Vector2(...points[(i + n) % n]!)
  return points.map((_, i) => {
    const p = v(i)
    const inNormal = (a: THREE.Vector2, b: THREE.Vector2) => {
      const dir = b.clone().sub(a).normalize()
      // interior is left of the edge for CCW polygons
      return ccw ? new THREE.Vector2(-dir.y, dir.x) : new THREE.Vector2(dir.y, -dir.x)
    }
    const n1 = inNormal(v(i - 1), p)
    const n2 = inNormal(p, v(i + 1))
    return [p.x + (n1.x + n2.x) * d, p.y + (n1.y + n2.y) * d]
  })
}

/** A plain polygon Shape. */
function polygon(points: [number, number][]): THREE.Shape {
  const shape = new THREE.Shape()
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
  shape.closePath()
  return shape
}

/** A Shape whose corners are rounded with radius r (works for concave corners too). */
function roundedPolygon(points: [number, number][], r: number): THREE.Shape {
  const shape = new THREE.Shape()
  const n = points.length
  const v = (i: number) => new THREE.Vector2(...points[(i + n) % n]!)
  for (let i = 0; i < n; i++) {
    const p = v(i)
    const prev = v(i - 1)
    const next = v(i + 1)
    const toPrev = prev.clone().sub(p).normalize()
    const toNext = next.clone().sub(p).normalize()
    const a = p.clone().addScaledVector(toPrev, r)
    const b = p.clone().addScaledVector(toNext, r)
    if (i === 0) shape.moveTo(a.x, a.y)
    else shape.lineTo(a.x, a.y)
    shape.quadraticCurveTo(p.x, p.y, b.x, b.y)
  }
  shape.closePath()
  return shape
}

export interface ProceduralLogo {
  geometry: THREE.BufferGeometry
  /** Interior volumes in world units, centred like the geometry. */
  boxes: THREE.Box3[]
}

/** Builds the merged, centred, world-unit geometry and the interior volumes. */
export function makeLogoGeometry(): ProceduralLogo {
  const depth = DEPTH[1] - DEPTH[0]
  const parts = LOGO_BLOCKS.map((b) => {
    // ExtrudeGeometry grows the outline by bevelSize; inset first so the finished silhouette
    // matches the measured bounds (same trick as the nav pill). With BEVEL 0 the outline is
    // used as-is and the corners stay sharp.
    const shape =
      BEVEL > 0
        ? roundedPolygon(inset(b.outline, BEVEL), Math.max(BEVEL * 0.5, 4))
        : polygon(b.outline)
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: depth - BEVEL * 2,
      bevelEnabled: BEVEL > 0,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 4,
      curveSegments: 6,
      steps: 1,
    })
    // Extrude runs 0..depth along +z (plus bevels); centre it on the export's z range.
    g.translate(0, 0, DEPTH[0] + BEVEL)
    return g
  })
  const geometry = mergeGeometries(parts, false)!
  parts.forEach((p) => p.dispose())
  geometry.translate(-CENTRE[0], -CENTRE[1], -CENTRE[2])
  geometry.scale(px(1), px(1), px(1))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  const boxes = LOGO_BLOCKS.flatMap((b) =>
    b.volumes.map(
      ([[x0, y0], [x1, y1]]) =>
        new THREE.Box3(
          new THREE.Vector3(px(x0 - CENTRE[0]), px(y0 - CENTRE[1]), px(DEPTH[0] - CENTRE[2])),
          new THREE.Vector3(px(x1 - CENTRE[0]), px(y1 - CENTRE[1]), px(DEPTH[1] - CENTRE[2])),
        ),
    ),
  )
  return { geometry, boxes }
}
