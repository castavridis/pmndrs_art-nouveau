import * as THREE from 'three'

export interface ReliefOptions {
  /** Lines of text, drawn left-aligned from the top-left inset. */
  lines: string[]
  /** Canvas size in px (match the slab's aspect). */
  width: number
  height: number
  fontPx: number
  fontFamily?: string
  weight?: number | string
  /** Inset from the left / top edge, px. */
  insetX?: number
  insetY?: number
  /** Edge softness in px (blur of the height map). */
  soften?: number
  /** Relief strength: how steep the normal map's slopes are. */
  strength?: number
  /** Engrave (into the surface) or emboss (out of it). */
  emboss?: boolean
}

/**
 * Bakes text into a normal map: the glyphs are drawn as a height field on a canvas, softened,
 * and converted to tangent-space normals with a Sobel filter. On a glass material the text
 * then reads as etched (or raised) relief, refracting and catching highlights like the surface.
 */
export function bakeTextRelief(o: ReliefOptions): THREE.DataTexture {
  const { width, height } = o
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  ctx.filter = o.soften ? `blur(${o.soften}px)` : 'none'
  ctx.fillStyle = '#fff'
  ctx.font = `${o.weight ?? 500} ${o.fontPx}px ${o.fontFamily ?? "'Inter Variable', Inter, system-ui, sans-serif"}`
  ctx.textBaseline = 'top'
  const x = o.insetX ?? 40
  let y = o.insetY ?? 40
  for (const line of o.lines) {
    ctx.fillText(line, x, y)
    y += o.fontPx * 1.3
  }
  const img = ctx.getImageData(0, 0, width, height).data
  const h = (px: number, py: number) => {
    const cx = Math.min(width - 1, Math.max(0, px))
    const cy = Math.min(height - 1, Math.max(0, py))
    return img[(cy * width + cx) * 4]! / 255
  }
  const sign = o.emboss ? 1 : -1
  const k = (o.strength ?? 2) * sign
  const out = new Uint8Array(width * height * 4)
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // Sobel gradients of the height field.
      const gx = h(px + 1, py - 1) + 2 * h(px + 1, py) + h(px + 1, py + 1) - h(px - 1, py - 1) - 2 * h(px - 1, py) - h(px - 1, py + 1)
      const gy = h(px - 1, py + 1) + 2 * h(px, py + 1) + h(px + 1, py + 1) - h(px - 1, py - 1) - 2 * h(px, py - 1) - h(px + 1, py - 1)
      const n = new THREE.Vector3(-gx * k, gy * k, 1).normalize()
      const i = (py * width + px) * 4
      out[i] = (n.x * 0.5 + 0.5) * 255
      out[i + 1] = (n.y * 0.5 + 0.5) * 255
      out[i + 2] = (n.z * 0.5 + 0.5) * 255
      out[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(out, width, height, THREE.RGBAFormat)
  tex.flipY = true
  tex.needsUpdate = true
  return tex
}

/** Remaps a geometry's UVs to its own xy bounds (0..1), so a baked texture spans the front face. */
export function uvFromBounds(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geometry.clone()
  g.computeBoundingBox()
  const b = g.boundingBox!
  const pos = g.attributes.position as THREE.BufferAttribute
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - b.min.x) / (b.max.x - b.min.x)
    uv[i * 2 + 1] = (pos.getY(i) - b.min.y) / (b.max.y - b.min.y)
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}
