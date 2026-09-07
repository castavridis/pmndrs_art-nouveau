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
