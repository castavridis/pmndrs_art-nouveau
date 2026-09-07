import { create } from 'zustand'
import type { NavLink, NavMode } from './types'
import { tokens } from './tokens'

export interface NavState {
  links: NavLink[]
  mode: NavMode
  hovered: string | null
  active: string | null
  /** True once the 3D layer has mounted and should be treated as the interactive surface. */
  is3D: boolean
  /** Collapsed-mode disclosure. */
  menuOpen: boolean
  /** Cmd palette dialog. */
  paletteOpen: boolean

  setLinks: (links: NavLink[]) => void
  setMode: (mode: NavMode) => void
  setHovered: (id: string | null) => void
  setActive: (id: string | null) => void
  setIs3D: (is3D: boolean) => void
  setMenuOpen: (open: boolean) => void
  setPaletteOpen: (open: boolean) => void
}

export const useNavStore = create<NavState>()((set) => ({
  links: [],
  mode: 'full',
  hovered: null,
  active: null,
  is3D: false,
  menuOpen: false,
  paletteOpen: false,

  setLinks: (links) => set({ links }),
  setMode: (mode) => set((s) => (s.mode === mode ? s : { mode, menuOpen: false })),
  setHovered: (hovered) => set({ hovered }),
  setActive: (active) => set({ active }),
  setIs3D: (is3D) => set({ is3D }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}))

/**
 * Pure mode resolver with hysteresis. `required` is the measured content width
 * for each mode (undefined when not yet measured). Shared by Nav2D and Nav3D.
 *
 * Downgrades happen as soon as the container is too small for the current mode.
 * Upgrades only happen when the container exceeds the *larger* mode's requirement
 * by `hysteresis`, so a resize hovering around a threshold never flaps.
 */
export function resolveMode(
  current: NavMode,
  container: number,
  required: Partial<Record<NavMode, number>>,
  hysteresis: number = tokens.modeHysteresis,
): NavMode {
  const fits = (m: NavMode, slack = 0) => {
    const w = required[m]
    return w === undefined ? false : container >= w + slack
  }
  if (current === 'full') {
    if (fits('full')) return 'full'
    return fits('compact') || required.compact === undefined ? 'compact' : 'collapsed'
  }
  if (current === 'compact') {
    if (fits('full', hysteresis)) return 'full'
    if (fits('compact')) return 'compact'
    return 'collapsed'
  }
  // collapsed
  if (fits('full', hysteresis)) return 'full'
  if (fits('compact', hysteresis)) return 'compact'
  return 'collapsed'
}
