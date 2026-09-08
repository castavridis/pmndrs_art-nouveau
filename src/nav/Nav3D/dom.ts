import { useResolvedTheme } from '../../theme'

/** Text colour of the items (3D labels, kbd, logo) per colour scheme. */
export const INKS = {
  light: { ink: '#111111', hover: '#3b2a6e', kbd: '#aab68a' },
  // Dark pages carry dark glass; the ink goes light so labels and logo stay legible.
  dark: { ink: '#f2f2ef', hover: '#dfff7a', kbd: '#4a5040' },
} as const

export function useInk() {
  return INKS[useResolvedTheme()]
}

/**
 * Click the DOM twin (Nav2D element with the same `data-id`) so the browser and Nav2D's
 * handlers do the real work: navigation, the command palette, focus, analytics.
 */
export function triggerDom(id: string) {
  document.querySelector<HTMLElement>(`[data-id="${id}"]`)?.click()
}
