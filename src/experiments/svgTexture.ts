import { useEffect, useState } from 'react'
import * as THREE from 'three'

/**
 * Rasterises an inline SVG that is already in the document into a texture, so the same glyph
 * the DOM renders can be placed inside a scene. Reading the live element rather than a second
 * copy of the artwork keeps the two from drifting apart.
 *
 * `currentColor` in the source resolves against the clone's own `color`, which is why the ink
 * is set on the clone rather than baked into every path.
 */
export function useSvgTexture(
  source: React.RefObject<HTMLElement | null>,
  ink: string,
  sizePx = 256,
  deps: unknown[] = [],
): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)
  useEffect(() => {
    const svg = source.current?.querySelector('svg')
    if (!svg) return
    let alive = true
    const clone = svg.cloneNode(true) as SVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', String(sizePx))
    clone.setAttribute('height', String(sizePx))
    // A data-URL SVG is rasterised on its own, with no cascade to inherit from, so
    // `currentColor` would fall back to black. Substitute the ink into the markup.
    const xml = new XMLSerializer().serializeToString(clone).replaceAll('currentColor', ink)
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
    const img = new Image()
    img.onload = () => {
      if (!alive) return
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = sizePx
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, sizePx, sizePx)
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.generateMipmaps = false
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.needsUpdate = true
      setTexture((old) => (old?.dispose(), tex))
    }
    img.src = url
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, ink, sizePx, ...deps])
  return texture
}
