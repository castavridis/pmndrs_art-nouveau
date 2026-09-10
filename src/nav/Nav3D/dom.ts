import { useResolvedTheme } from '../../theme'
import { useTuning } from './tuning'
import { useNavbarGlass } from './paletteTuning'

/** Text colour of the items (3D labels, kbd, logo) per colour scheme. */
export const INKS = {
  light: { ink: '#111111', hover: '#3b2a6e', kbd: '#aab68a' },
  // Dark pages carry dark glass; the ink goes light so labels and logo stay legible.
  dark: { ink: '#f2f2ef', hover: '#dfff7a', kbd: '#4a5040' },
} as const

/** Relative luminance (0..1) of a hex colour. */
export function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!
}

/**
 * A first guess at the ink for text on the glass, from the tuning: the glass's buffer
 * background is what shows through it, so a clearly dark or clearly light one decides; in
 * between, the page theme does. Text on glass is inked by measurement (contrast.ts); this
 * stands in until the first reading, on the server, and in the vector fallback.
 */
export function useInk() {
  const bg = useTuning((s) => s.glass.background)
  return useInkFor(bg)
}

/**
 * The same first guess for the nav's own labels, logo and keys (measured in NavContrast.tsx):
 * keyed to the glass the nav bar actually wears (materials.navbar), which may be a preset rather
 * than the live tuning, so a nav bar given a dark preset on a light-tuned page does not start
 * inked for the wrong surface.
 */
export function useNavInk() {
  return useInkFor(useNavbarGlass().background)
}

function useInkFor(bg: string) {
  const theme = useResolvedTheme()
  const forced = useTuning((s) => s.env.ink)
  if (forced === 'light') return INKS.dark // light ink is the dark-page set
  if (forced === 'dark') return INKS.light
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
