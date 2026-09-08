import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavStore, useNavStoreApi, resolveMode } from './store'
import { tokens, tokensToCssVars } from './tokens'
import { NAV_MODES, type NavLink, type NavMode } from './types'
import { Logo } from './Logo'
import { CmdPalette } from './CmdPalette'
import leftCluster from './assets/fallback/nav-left.svg'
import rightCluster from './assets/fallback/nav-right.svg'
import petalSvg from './assets/fallback/petal.svg'
import leftOutline from './assets/fallback/outline/nav-left.svg'
import rightOutline from './assets/fallback/outline/nav-right.svg'
import petalOutline from './assets/fallback/outline/petal.svg'
import fallback from './assets/fallback/manifest.json'
import { middleSegment, petalPlacements } from './petalLayout'
import styles from './Nav2D.module.css'
// Same face as the 3D labels (uikit ships Inter as MSDF), so the DOM anchors sit exactly
// under their 3D twins: focus rings and hover land on the right item.
import '@fontsource-variable/inter'

/**
 * The DOM nav. Always mounted; it is the SSR / a11y / SEO source of truth.
 * The 3D layer (when present) drives these anchors via `data-id`.
 *
 * Until the first client-side measurement, no `data-mode` is set: the server HTML and
 * the no-JS experience use the `full` layout with a horizontally scrollable pill.
 */
export function Nav2D({ links, vector = false }: { links: NavLink[]; vector?: boolean }) {
  const mode = useNavStore((s) => s.mode)
  const [measured, setMeasured] = useState(false)
  const [pillWidth, setPillWidth] = useState<number | null>(null)
  const setMode = useNavStore((s) => s.setMode)
  const active = useNavStore((s) => s.active)
  const setActive = useNavStore((s) => s.setActive)
  const menuOpen = useNavStore((s) => s.menuOpen)
  const setMenuOpen = useNavStore((s) => s.setMenuOpen)
  const setPaletteOpen = useNavStore((s) => s.setPaletteOpen)
  const setFocused = useNavStore((s) => s.setFocused)
  const api = useNavStoreApi()

  const rootRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  /** Measured pill width per mode. Reset whenever links change. */
  const required = useRef<Partial<Record<NavMode, number>>>({})

  const cssVars = useMemo(() => tokensToCssVars() as CSSProperties, [])

  // Mark the current page as active on mount (unless <Nav active> controls it).
  useEffect(() => {
    if (active !== null) return
    const path = window.location.pathname
    const match = links.find((l) => l.href === path)
    if (match) setActive(match.id)
  }, [links, active, setActive])

  // Measure + resolve mode. Runs on container resize, pill resize (fonts, links) and links change.
  useLayoutEffect(() => {
    required.current = {}
    const root = rootRef.current
    const pill = pillRef.current
    if (!root || !pill) return

    const measure = () => {
      const current = api.getState().mode
      // Probe the natural pill width in every mode by swapping data-mode synchronously.
      // The pill is `width: max-content`, so scrollWidth is its natural width. The attribute
      // is restored before we return, so observers never see an intermediate size.
      root.dataset.probing = ''
      for (const m of NAV_MODES) {
        root.dataset.mode = m
        required.current[m] = pill.scrollWidth + tokens.clusterBleedX * 2
      }
      root.dataset.mode = current
      // Force style resolution at the restored mode before re-enabling transitions.
      void pill.scrollWidth
      delete root.dataset.probing
      const next = resolveMode(current, root.clientWidth, required.current)
      if (next !== current) setMode(next)
      setMeasured(true)
      // The pill's settled width in the resolved mode: places the traced petals exactly where
      // the 3D ones will be (see petalLayout.ts).
      const w = required.current[next]! - tokens.clusterBleedX * 2
      setPillWidth(w)
      api.getState().setPillWidth(w)
    }

    // Defer observer-driven measurements to the next frame: probing mutates the pill's size,
    // and doing that inside the callback trips "ResizeObserver loop completed" errors.
    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    const ro = new ResizeObserver(schedule)
    ro.observe(root)
    ro.observe(pill)
    // Attribute must exist before probing so the CSS mode rules apply during the probe.
    root.dataset.mode = api.getState().mode
    measure()
    // Re-measure once web fonts are in.
    document.fonts?.ready.then(schedule).catch(() => {})
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [links, setMode, api])

  // Collapsed disclosure: close on Escape / outside click.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [menuOpen, setMenuOpen])

  const petalCount = Math.min(Math.max(links.length, 1), 3)
  const petals = useMemo(() => (pillWidth ? petalPlacements(pillWidth, petalCount) : []), [pillWidth, petalCount])

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-mode={measured ? mode : undefined}
      data-vector={vector || undefined}
      style={cssVars}
    >
      <nav aria-label="Main" className={styles.nav}>
        {/* Traced silhouettes of the 3D clusters (scripts/trace-svgs.mjs), pinned to the pill's cap
            centres exactly like the 3D ones: the manifest gives each SVG's size and origin. */}
        <img
          className={`${styles.cluster} ${styles.clusterLeft}`}
          src={vector ? leftOutline : leftCluster}
          data-outline={vector || undefined}
          alt=""
          aria-hidden="true"
          width={fallback['nav-left'].width}
          height={fallback['nav-left'].height}
          style={{
            left: tokens.clusterBleedX + tokens.pillRadius - fallback['nav-left'].originX,
            top: tokens.clusterBleedY + tokens.pillHeight / 2 - fallback['nav-left'].originY,
          }}
        />
        <img
          className={`${styles.cluster} ${styles.clusterRight}`}
          src={vector ? rightOutline : rightCluster}
          data-outline={vector || undefined}
          alt=""
          aria-hidden="true"
          width={fallback['nav-right'].width}
          height={fallback['nav-right'].height}
          style={{
            right:
              tokens.clusterBleedX +
              tokens.pillRadius -
              (fallback['nav-right'].width - fallback['nav-right'].originX),
            top: tokens.clusterBleedY + tokens.pillHeight / 2 - fallback['nav-right'].originY,
          }}
        />
        {petals.map((p, i) => {
          // Pill centre inside .nav (which pads by the bleed), then the shared placement.
          const cx = tokens.clusterBleedX + pillWidth! / 2 + p.fx * middleSegment(pillWidth!)
          const cy = tokens.clusterBleedY + tokens.pillHeight / 2 - p.y
          return (
            <img
              key={i}
              className={styles.petal}
              src={vector ? petalOutline : petalSvg}
              data-outline={vector || undefined}
              alt=""
              aria-hidden="true"
              width={fallback.petal.width}
              height={fallback.petal.height}
              style={{
                left: cx - fallback.petal.originX,
                top: cy - fallback.petal.originY,
                // three's +z rotation is counter-clockwise on screen; CSS rotate is clockwise.
                transform: `rotate(${-p.rotation[2]}rad)`,
              }}
            />
          )
        })}

        <div ref={pillRef} className={styles.pill}>
          <a
            className={styles.logo}
            href="/"
            aria-label="pmndrs home"
            data-id="logo"
            onFocus={() => setFocused('logo')}
            onBlur={() => setFocused(null)}
          >
            <Logo />
          </a>

          <button
            type="button"
            className={styles.menuBtn}
            data-id="menu"
            aria-expanded={menuOpen}
            aria-controls="nav-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
            <span className={styles.srOnly}>Menu</span>
          </button>

          {/* Always in the DOM so every mode can be measured; CSS hides it in collapsed. */}
          <LinkList links={links} active={active} />

          <button
            type="button"
            className={styles.cmd}
            data-id="cmd"
            aria-haspopup="dialog"
            aria-keyshortcuts="Meta+K Control+K"
            onClick={() => setPaletteOpen(true)}
            onFocus={() => setFocused('cmd')}
            onBlur={() => setFocused(null)}
          >
            Cmd
            <kbd aria-hidden="true" className={styles.kbd}>
              ⌘K
            </kbd>
          </button>
        </div>

        <div
          ref={menuRef}
          id="nav-menu"
          className={styles.menu}
          data-open={menuOpen}
          hidden={mode !== 'collapsed' || !menuOpen}
        >
          {mode === 'collapsed' && <LinkList links={links} active={active} />}
        </div>
      </nav>
      <CmdPalette />
    </div>
  )
}

function LinkList({ links, active }: { links: NavLink[]; active: string | null }) {
  const setHovered = useNavStore((s) => s.setHovered)
  const setFocused = useNavStore((s) => s.setFocused)
  return (
    <ul className={styles.links}>
      {links.map((l) => (
        <li key={l.id}>
          <a
            className={styles.link}
            href={l.href}
            data-id={l.id}
            aria-current={active === l.id ? 'page' : undefined}
            onPointerEnter={() => setHovered(l.id)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setFocused(l.id)}
            onBlur={() => setFocused(null)}
          >
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  )
}
