import * as THREE from 'three'

export interface PrintedText {
  /** Bold lead-in, e.g. "v10 is out." */
  lead?: string
  /** The rest of the sentence. */
  body?: string
  /** Trailing link label, drawn underlined. */
  link?: string
}

export interface PrintOptions extends PrintedText {
  /** Slab size in CSS px. */
  width: number
  height: number
  /** Left inset, matching the DOM content's padding. */
  insetX?: number
  fontPx?: number
  /** Ink; the glyphs are drawn opaque on a transparent ground. */
  color?: string
  /** Raster scale over CSS px. */
  scale?: number
  /** Ground behind the glyphs; transparent by default. */
  background?: string
}

const FONT = "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"

/**
 * Draws the banner's text into a transparent raster, laid out like the DOM copy it stands in
 * for. It is painted onto the glass with the surface's own geometry (see `slabUv`), so a
 * fragment cut from the slab carries the part of the text it covered.
 *
 * Canvas2D rather than @pmndrs/glyph: that library renders through `three/webgpu` + TSL, and
 * every canvas here is the WebGL renderer with drei's transmission material.
 */
export function printAnnouncement(o: PrintOptions): THREE.CanvasTexture {
  const scale = o.scale ?? 3
  const fontPx = o.fontPx ?? 15
  const insetX = o.insetX ?? 88
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(o.width * scale))
  canvas.height = Math.max(1, Math.round(o.height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  if (o.background) {
    ctx.fillStyle = o.background
    ctx.fillRect(0, 0, o.width, o.height)
  }
  ctx.textBaseline = 'middle'

  const y = o.height / 2
  let x = insetX
  const draw = (text: string, weight: number, underline = false) => {
    if (!text) return
    ctx.font = `${weight} ${fontPx}px ${FONT}`
    ctx.fillStyle = o.color ?? '#ffffff'
    ctx.fillText(text, x, y)
    const w = ctx.measureText(text).width
    if (underline) {
      ctx.fillRect(x, y + fontPx * 0.62, w, Math.max(1, fontPx / 15))
    }
    x += w
  }

  draw(o.lead ?? '', 700)
  if (o.lead && o.body) x += fontPx * 0.28
  draw(o.body ?? '', 400)
  if (o.link) {
    x += fontPx * 1.1
    draw(o.link, 500, true)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  // The slab's UVs run bottom-up; the raster is drawn top-down.
  texture.flipY = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

/**
 * Writes UVs that map a piece's own xy back onto the whole slab, so a fragment cut from the
 * slab shows exactly the part of the printed text it covered. `offset` is where the piece sat
 * on the slab before it was re-origined (world units).
 */
export function slabUv(
  geometry: THREE.BufferGeometry,
  width: number,
  height: number,
  offset: [number, number] = [0, 0],
  scale = 1,
): THREE.BufferGeometry {
  const pos = geometry.attributes.position as THREE.BufferAttribute
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    // The mesh's own scale is applied at render time, so fold it in here.
    uv[i * 2] = (pos.getX(i) * scale + offset[0]) / width + 0.5
    uv[i * 2 + 1] = (pos.getY(i) * scale + offset[1]) / height + 0.5
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geometry
}
