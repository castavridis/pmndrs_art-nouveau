import { useResolvedTheme } from '../../theme'
import { useTuning } from './tuning'

/** Text colour of the items (3D labels, kbd, logo) per colour scheme. */
export const INKS = {
  light: { ink: '#111111', hover: '#3b2a6e', kbd: '#aab68a' },
  // Dark pages carry dark glass; the ink goes light so labels and logo stay legible.
  dark: { ink: '#f2f2ef', hover: '#dfff7a', kbd: '#4a5040' },
} as const

/** Relative luminance (0..1) of a hex colour. */
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!
}

/**
 * Ink for text drawn on the glass. The glass's buffer background is what shows through it,
 * so a clearly dark or clearly light one decides the ink; in between, the page theme does.
 */
export function useInk() {
  const theme = useResolvedTheme()
  const bg = useTuning((s) => s.glass.background)
  const y = luminance(bg)
  const scheme = y < 0.25 ? 'dark' : y > 0.5 ? 'light' : theme
  return INKS[scheme]
}

/**
 * Click the DOM twin (Nav2D element with the same `data-id`) so the browser and Nav2D's
 * handlers do the real work: navigation, the command palette, focus, analytics.
 */
export function triggerDom(id: string) {
  document.querySelector<HTMLElement>(`[data-id="${id}"]`)?.click()
}
