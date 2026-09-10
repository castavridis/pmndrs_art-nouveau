export interface NavLink {
  id: string
  label: string
  href: string
  /** One line under the title in the ⌘K picker. */
  description?: string
  /** Breadcrumb under it, e.g. "docs / fiber". Defaults to the href's path. */
  section?: string
}

/** Responsive layout mode. Driven by container width vs. measured content width. */
export type NavMode = 'full' | 'compact' | 'collapsed'

export const NAV_MODES: readonly NavMode[] = ['full', 'compact', 'collapsed']

/**
 * Glass behind a piece of text, as measured (Nav3D/contrast.ts). `light` glass takes the dark
 * ink and `dark` glass the light one: the names are the ink sets' (INKS), keyed by the page
 * scheme each was made for.
 */
export interface ContrastReading {
  scheme: 'light' | 'dark'
  /** Opacity of the veil that brings the text to target; 0 unless the region asked for one. */
  veil: number
}
