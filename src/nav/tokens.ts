/**
 * Single source of truth for every magic number in the nav.
 * Shared by CSS (as custom properties via `tokensToCssVars`) and by the 3D scene.
 * All lengths are CSS px; the 3D canvas maps 100 px → 1 world unit.
 */
export const tokens = {
  /** Height of the pill body. */
  pillHeight: 52,
  /** Corner radius of the pill caps (= height/2: the exported navbar.glb is a true stadium). */
  pillRadius: 26,
  /** Padding from the left cap edge to the logo (the reference leaves more room here). */
  pillPadStart: { full: 44, compact: 24, collapsed: 14 },
  /** Padding from the Cmd item to the right cap edge. */
  pillPadEnd: { full: 28, compact: 18, collapsed: 14 },
  /** Gap between items. */
  gap: { full: 32, compact: 20, collapsed: 12 },
  /** Item font size. */
  fontSize: { full: 18, compact: 15, collapsed: 15 },
  /** Logo glyph size (square). */
  logoSize: 28,
  /** Depth of the pill in 3D. */
  pillDepth: 6,
  /** Extra space reserved outside the pill for the clusters, so they never get clipped. */
  clusterBleedX: 56,
  clusterBleedY: 52,
  /** Hysteresis in px applied when switching modes, to avoid flapping. */
  modeHysteresis: 24,
  /** Cross-fade duration between 2D and 3D, in ms. */
  swapDurationMs: 600,
  /** CSS px per world unit in the 3D scene (orthographic zoom). */
  pxPerUnit: 100,
} as const

/** CSS px → world units. */
export const px = (n: number) => n / tokens.pxPerUnit

export type Tokens = typeof tokens

/** Flatten tokens into `--nav-*` custom properties for the DOM fallback. */
export function tokensToCssVars(t: Tokens = tokens): Record<`--nav-${string}`, string> {
  const vars: Record<string, string> = {}
  const walk = (obj: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const name = prefix ? `${prefix}-${kebab(k)}` : kebab(k)
      if (typeof v === 'number') vars[`--nav-${name}`] = `${v}px`
      else if (v && typeof v === 'object') walk(v as Record<string, unknown>, name)
    }
  }
  walk(t as unknown as Record<string, unknown>, '')
  return vars as Record<`--nav-${string}`, string>
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
