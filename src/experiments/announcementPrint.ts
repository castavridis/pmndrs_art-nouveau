import * as THREE from 'three'

/** One run of text on one line, positioned in the slab's own px space. */
export interface PrintSegment {
  text: string
  /** Left edge and vertical centre, in px from the slab's top-left. */
  x: number
  y: number
  /** CSS font shorthand, copied from the element the run came from. */
  font: string
  underline: boolean
}

/**
 * Reads the rendered copy back out of the DOM: every text run with its measured position,
 * font and decoration, in the slab's px space.
 *
 * Measuring rather than re-laying-out means the print matches the DOM copy exactly, including
 * where it wraps — so the same markup drives the accessible text and the glass, and no call
 * site has to repeat its words. Runs are split per line by walking characters and grouping
 * them by the line box each lands in.
 */
export function readPrintSegments(content: HTMLElement, origin: DOMRect): PrintSegment[] {
  const out: PrintSegment[] = []
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? ''
    if (!text.trim()) continue
    const parent = node.parentElement
    if (!parent) continue
    const cs = getComputedStyle(parent)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    const underline = cs.textDecorationLine.includes('underline')

    let line = ''
    let lineTop = NaN
    let lineLeft = 0
    let lineHeight = 0
    const flush = () => {
      if (!line.trim()) return
      out.push({ text: line, x: lineLeft - origin.x, y: lineTop + lineHeight / 2 - origin.y, font, underline })
    }
    for (let i = 0; i < text.length; i++) {
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const r = range.getBoundingClientRect()
      // A zero box is collapsed whitespace: keep the character, stay on the line.
      if (r.width === 0 && r.height === 0) {
        line += text[i]
        continue
      }
      if (Number.isNaN(lineTop) || Math.abs(r.top - lineTop) > 1) {
        flush()
        line = ''
        lineTop = r.top
        lineLeft = r.left
        lineHeight = r.height
      }
      line += text[i]
    }
    flush()
  }
  return out
}

export interface PrintOptions {
  /** Slab size in CSS px. */
  width: number
  height: number
  /** Ink; the glyphs are drawn opaque on a clear ground. */
  color?: string
  /** Raster scale over CSS px. */
  scale?: number
}

/**
 * Draws measured runs into a transparent raster. It is painted onto the glass with the
 * surface's own geometry (see `slabUv`), so a fragment cut from the slab carries the part of
 * the text it covered, and the words break apart with the glass.
 *
 * Canvas2D rather than @pmndrs/glyph: that library renders through `three/webgpu` + TSL, and
 * every canvas here is the WebGL renderer with drei's transmission material.
 */
export function printSegments(segments: PrintSegment[], o: PrintOptions): THREE.CanvasTexture {
  const scale = o.scale ?? 3
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(o.width * scale))
  canvas.height = Math.max(1, Math.round(o.height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = o.color ?? '#ffffff'
  for (const s of segments) {
    ctx.font = s.font
    ctx.fillText(s.text, s.x, s.y)
    if (s.underline) {
      const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(s.font)?.[1] ?? '15')
      ctx.fillRect(s.x, s.y + size * 0.62, ctx.measureText(s.text).width, Math.max(1, size / 15))
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
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
