/** Card metrics in CSS px (shared by the 3D surface and the CSS card). */
export const callout = {
  /** Maximum width; the card fills its container up to this. */
  width: 560,
  /** Height before measurement (SSR / first paint); the card grows with its content. */
  height: 320,
  radius: 40,
  depth: 8,
  /** Icon (lens ring) diameter. */
  icon: 96,
  /** Icon centre from the card's top-left corner. */
  iconX: 64,
  iconY: 64,
  padding: 40,
} as const
