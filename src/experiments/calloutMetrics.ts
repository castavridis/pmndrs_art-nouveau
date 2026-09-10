/** Card metrics in CSS px (shared by the 3D surface and the CSS card). */
export const callout = {
  /** Maximum width; the card fills its container up to this. */
  width: 560,
  /** Height before measurement (SSR / first paint); the card grows with its content. */
  height: 320,
  radius: 8,
  depth: 8,
  /** Icon diameter as traced: the leaves are drawn at this scale, the ring at `lensScale` of it. */
  icon: 96,
  /** The ring alone is drawn smaller than the traced icon; the leaves keep their size. */
  lensScale: 0.75,
  /** Icon centre from the card's top-left corner. */
  iconX: 59,
  iconY: 54,
  padding: 10,
  /**
   * Eyebrow and title type. The head block (eyebrow, its gap, and the title's first line) is
   * centred on the lens, so its height has to be known here rather than left to the font.
   */
  head: { kindLine: 15, kindGap: 6, titleLine: 28 },
} as const

/** Height of the block that is centred on the lens: eyebrow, gap, first line of the title. */
export const calloutHeadHeight = callout.head.kindLine + callout.head.kindGap + callout.head.titleLine

/** Radius of the ring as drawn. */
export const calloutLensRadius = (callout.icon * callout.lensScale) / 2
