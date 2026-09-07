import { useEffect } from 'react'
import type { NavLink } from './types'
import { useNavStore, watchReducedMotion } from './store'
import { Nav2D } from './Nav2D'

export interface NavProps {
  /** Middle links. Logo and Cmd are always present and are not part of this list. */
  links: NavLink[]
}

/**
 * Public entry. Renders the DOM nav immediately; the 3D layer is added in Task 6
 * as a progressive enhancement once GPU tier / WebGL / motion preferences are known.
 */
export function Nav({ links }: NavProps) {
  // Links are prop-drilled into Nav2D so the server render is complete without effects;
  // the store copy exists for the 3D layer and the command palette.
  const setLinks = useNavStore((s) => s.setLinks)
  useEffect(() => setLinks(links), [links, setLinks])
  useEffect(watchReducedMotion, [])
  return <Nav2D links={links} />
}

