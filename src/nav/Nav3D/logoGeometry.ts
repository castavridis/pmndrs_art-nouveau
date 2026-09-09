import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import logoRaw from '../assets/logo.svg?raw'
import { px } from '../tokens'

/**
 * The pmndrs mark from `assets/logo.svg`, extruded. The nav draws the SVG itself (uikit
 * `<Svg>`), so this exists for scenes that want the mark as geometry — the frankenstein
 * collages. Parsed once at module scope: the file is a few hundred bytes and the parse is
 * synchronous, so there is no loader or Suspense boundary to arrange.
 *
 * SVG's y axis points down; the shapes are mirrored on y (rather than scaling the finished
 * geometry, which would invert the winding and turn the faces inside out).
 */
function buildLogoGeometry(sizePx: number, depthPx: number): THREE.ExtrudeGeometry {
  const paths = new SVGLoader().parse(logoRaw).paths
  const shapes: THREE.Shape[] = []
  for (const path of paths) {
    for (const shape of SVGLoader.createShapes(path)) {
      const { shape: outline, holes } = shape.extractPoints(12)
      const flip = (pts: THREE.Vector2[]) => pts.map((p) => new THREE.Vector2(p.x, -p.y))
      const s = new THREE.Shape(flip(outline))
      s.holes = holes.map((h) => new THREE.Path(flip(h)))
      shapes.push(s)
    }
  }
  const bevel = px(depthPx) * 0.3
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: Math.max(px(depthPx) - bevel * 2, 0.001),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
    steps: 1,
  })
  // Centre on its own bounds, then fit the mark's longest side to `sizePx`.
  geometry.center()
  geometry.computeBoundingBox()
  const size = geometry.boundingBox!.getSize(new THREE.Vector3())
  const fit = px(sizePx) / Math.max(size.x, size.y)
  geometry.scale(fit, fit, 1)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

let cached: THREE.ExtrudeGeometry | undefined
/** The mark at `tokens.logoSize`, built once and shared. */
export const logoGeometry = () => (cached ??= buildLogoGeometry(28, 3))
