import { createContext, useContext } from 'react'
import { createStore, useStore, type StoreApi } from 'zustand'
import type { ContrastReading, NavLink, NavMode } from './types'
import { tokens } from './tokens'

export interface NavState {
  links: NavLink[]
  mode: NavMode
  hovered: string | null
  /** The DOM pill's settled width in px (Nav2D measures it); seeds the shared petal scatter. */
  pillWidth: number | null
  /** Keyboard focus among the items (mirrors the DOM anchors' focus). */
  focused: string | null
  active: string | null
  /** True once the 3D layer has rendered and should be treated as the interactive surface. */
  is3D: boolean
  /** Collapsed-mode disclosure. */
  menuOpen: boolean
  /** Cmd palette dialog. */
  paletteOpen: boolean
  /** `prefers-reduced-motion: reduce`. Springs go immediate, Float is off. */
  reducedMotion: boolean
  /**
   * The glass behind each item's label (and the logo) as measured (contrast.ts), by id: which
   * ink reads on it and, for the item under the selection chip, the veil the chip needs. Absent
   * until measured, when the nav's own ink stands in.
   */
  readings: Record<string, ContrastReading>

  setLinks: (links: NavLink[]) => void
  setMode: (mode: NavMode) => void
  setHovered: (id: string | null) => void
  setPillWidth: (w: number | null) => void
  setFocused: (id: string | null) => void
  setActive: (id: string | null) => void
  setIs3D: (is3D: boolean) => void
  setMenuOpen: (open: boolean) => void
  setPaletteOpen: (open: boolean) => void
  setReducedMotion: (reduced: boolean) => void
  setReading: (id: string, reading: ContrastReading) => void
}

export type NavStoreApi = StoreApi<NavState>

/** One store per <Nav>, so several navs can live on one page (e.g. the dev gallery). */
export function createNavStore(initial?: Partial<Pick<NavState, 'links'>>): NavStoreApi {
  return createStore<NavState>()((set) => ({
    links: initial?.links ?? [],
    mode: 'full',
    hovered: null,
    pillWidth: null,
    focused: null,
    active: null,
    is3D: false,
    menuOpen: false,
    paletteOpen: false,
    reducedMotion: false,
    readings: {},

    setLinks: (links) => set({ links }),
    setMode: (mode) => set((s) => (s.mode === mode ? s : { mode, menuOpen: false })),
    setHovered: (hovered) => set({ hovered }),
    setPillWidth: (pillWidth) => set((s) => (s.pillWidth === pillWidth ? s : { pillWidth })),
    setFocused: (focused) => set({ focused }),
    setActive: (active) => set({ active }),
    setIs3D: (is3D) => set({ is3D }),
    setMenuOpen: (menuOpen) => set({ menuOpen }),
    setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
    setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    setReading: (id, reading) => set((s) => (s.readings[id] === reading ? s : { readings: { ...s.readings, [id]: reading } })),
  }))
}

export const NavStoreContext = createContext<NavStoreApi | null>(null)

/** Shared store for components used outside a <Nav> (callouts, announcements, experiments). */
let sharedStore: NavStoreApi | undefined
const getSharedStore = () => (sharedStore ??= createNavStore())

/** The store instance of the enclosing <Nav>, or a shared default when there is none. */
export function useNavStoreApi(): NavStoreApi {
  return useContext(NavStoreContext) ?? getSharedStore()
}

/** Selector hook, same shape as a zustand bound store. Works inside the R3F Canvas (context is bridged). */
export function useNavStore<T>(selector: (s: NavState) => T): T {
  return useStore(useNavStoreApi(), selector)
}

/** Keep `reducedMotion` in sync with the OS setting. Call once per store on the client. */
export function watchReducedMotion(api: NavStoreApi): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const apply = () => api.getState().setReducedMotion(mq.matches)
  apply()
  mq.addEventListener('change', apply)
  return () => mq.removeEventListener('change', apply)
}

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
