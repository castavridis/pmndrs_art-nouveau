import raw from './assets/logo.svg?raw'

/**
 * The pmndrs mark, read from `assets/logo.svg` — the single source for every place it
 * appears: the DOM nav and docs chrome (`Logo.tsx`), the 3D pill (uikit `<Svg>` in
 * `Nav3D/NavRoot.tsx`) and the traced fallbacks. Parsed with a regex rather than an SVG
 * library so the DOM path pulls in nothing (Nav2D must work with no three.js).
 * Fills are dropped: consumers colour the mark themselves (`currentColor` / the nav ink).
 */
const PATH_TAG = /<path\b[^>]*>/g
const D_ATTR = /\bd="([^"]+)"/
const FILL_RULE = /\bfill-rule="([^"]+)"/
const VIEW_BOX = /\bviewBox="([^"]+)"/

export interface LogoPath {
  d: string
  fillRule?: 'evenodd' | 'nonzero'
}

export const logoViewBox = VIEW_BOX.exec(raw)?.[1] ?? '0 0 800 800'

export const logoPaths: LogoPath[] = [...raw.matchAll(PATH_TAG)].flatMap((m) => {
  const d = D_ATTR.exec(m[0])?.[1]
  if (!d) return []
  const rule = FILL_RULE.exec(m[0])?.[1]
  return [{ d, fillRule: rule === 'evenodd' ? ('evenodd' as const) : undefined }]
})

/** The mark's own coordinate box, for scaling it into another space. */
export const logoBox = (() => {
  const [x, y, w, h] = logoViewBox.split(/[\s,]+/).map(Number)
  return { x: x ?? 0, y: y ?? 0, width: w ?? 800, height: h ?? 800 }
})()
