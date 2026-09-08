import * as THREE from 'three'
import { px } from '../tokens'

/**
 * A rounded rectangle slab (the pill's construction, generalised): all sizes in CSS px,
 * the finished silhouette matches `widthPx` × `heightPx` exactly (outline inset by the bevel).
 */
export function makeRoundedRectGeometry(widthPx: number, heightPx: number, radiusPx: number, depthPx: number, bevelPx = depthPx * 0.35) {
  const w = px(widthPx)
  const h = px(heightPx)
  const d = px(depthPx)
  const bevel = px(bevelPx)
  const r = Math.max(px(radiusPx) - bevel, 0.005)
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
    depth: Math.max(d - bevel * 2, 0.001),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 16,
    steps: 1,
  })
  geo.center()
  return geo
}
