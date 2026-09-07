import * as THREE from 'three'
import { px, tokens } from '../tokens'

/** Rounded-rect extrusion for the pill. Caps use tokens.pillRadius; width is in CSS px. */
export function makePillGeometry(widthPx: number) {
  const w = px(widthPx)
  const h = px(tokens.pillHeight)
  const d = px(tokens.pillDepth)
  const bevel = d * 0.35
  // Shrink the outline by the bevel so the finished silhouette matches the requested size.
  const r = Math.max(px(tokens.pillRadius) - bevel, 0.01)
  const hw = w / 2 - bevel
  const hh = h / 2 - bevel

  const shape = new THREE.Shape()
  shape.moveTo(-hw + r, -hh)
  shape.lineTo(hw - r, -hh)
  shape.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false)
  shape.lineTo(hw, hh - r)
  shape.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false)
  shape.lineTo(-hw + r, hh)
  shape.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false)
  shape.lineTo(-hw, -hh + r)
  shape.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false)

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
    steps: 1,
  })
  geo.center()
  return geo
}

/**
 * Stretches a pill geometry to a new width without rebuilding it: every vertex right of
 * centre moves +dx/2, every vertex left moves -dx/2. Caps keep their exact shape, only the
 * straight middle segment changes. Cheap enough to run every frame while a spring animates.
 */
export class PillMorph {
  readonly geometry: THREE.ExtrudeGeometry
  private readonly base: Float32Array
  private readonly baseWidthPx: number
  private currentPx: number

  constructor(baseWidthPx = 400) {
    this.baseWidthPx = Math.max(baseWidthPx, tokens.pillRadius * 2 + 1)
    this.geometry = makePillGeometry(this.baseWidthPx)
    this.base = Float32Array.from(this.geometry.attributes.position.array)
    this.currentPx = this.baseWidthPx
  }

  setWidth(widthPx: number) {
    const w = Math.max(widthPx, tokens.pillRadius * 2)
    if (w === this.currentPx) return
    this.currentPx = w
    const shift = px(w - this.baseWidthPx) / 2
    const pos = this.geometry.attributes.position
    const arr = pos.array as Float32Array
    for (let i = 0; i < arr.length; i += 3) {
      const bx = this.base[i]!
      arr[i] = bx + (bx > 0 ? shift : -shift)
    }
    pos.needsUpdate = true
    this.geometry.computeBoundingSphere()
  }

  dispose() {
    this.geometry.dispose()
  }
}
