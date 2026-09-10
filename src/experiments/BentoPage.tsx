import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { Nav2D } from '../nav/Nav2D'
import { createNavStore, NavStoreContext } from '../nav/store'
import type { NavLink } from '../nav/types'
import { Announcement } from './Announcement'
import { Callout } from './Callout'
import { BentoScene, type SlotBox } from './BentoScene'
import { Button, ButtonLink, CopyButton, Kbd, Popover } from '../ui'
import { BoltIcon, DiscordIcon, ExternalIcon, GitHubIcon, InfoIcon, MoonIcon, SunIcon, TerminalIcon, TwitterIcon } from '../ui/Icons'
import type * as THREE from 'three'
import { useIsClient } from '../isClient'
import { useInk } from '../nav/Nav3D/dom'
import { useMeasure } from './useMeasure'
import { useResolvedTheme, useThemeStore } from '../theme'
import styles from './Bento.module.css'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null

const LINKS: NavLink[] = [
  {
    id: 'docs',
    label: 'Docs',
    href: '/docs',
    description: 'Guides and API reference for the whole collective.',
    section: 'pmndrs / docs',
  },
  {
    id: 'examples',
    label: 'Examples',
    href: '/examples',
    description: 'Live sandboxes you can fork and edit in place.',
    section: 'pmndrs / examples',
  },
  {
    id: 'blog',
    label: 'Blog',
    href: '/blog',
    description: 'Release notes, deep dives and the odd experiment.',
    section: 'pmndrs / blog',
  },
]

const EMPTY: SlotBox = { el: null, width: 0, height: 0 }

/**
 * `/dev/bento`: one centred column in three tiers, laid out as the sister repo lays out its own
 * bento (pmndrs_mineral-pearl): the banner over the nav, then the things you use — the copy bar,
 * the callout and the theme switch — then the plain controls. The rows carry no headings: what
 * the elements are is the point, not what they are called.
 *
 * Everything is still drawn by ONE scene (BentoScene) behind the page — the nav, the banner, the
 * callout and the launcher's glass share petals, lights and postprocessing. The DOM stays the
 * source of truth for layout and text, and the 3D parts follow their DOM slots, so moving an
 * element in the markup moves its glass with it.
 */
export function BentoPage() {
  const client = useIsClient()
  const [store] = useState(() => {
    const s = createNavStore({ links: LINKS })
    s.getState().setActive('docs')
    return s
  })
  const pageRef = useRef<HTMLElement>(null)
  const navWrap = useRef<HTMLDivElement>(null)
  const navEl = useRef<HTMLElement | null>(null)
  const [announcement, setAnnouncement] = useState<SlotBox>(EMPTY)
  const [callout, setCallout] = useState<SlotBox>(EMPTY)
  const [ready, setReady] = useState(false)
  // The call to action is the theme switch, as in the sister repo: it says which ground it
  // would take you to and goes there. The scene draws the nav's glass behind it, so it is
  // measured and its DOM background stands down once that is up. Disabling it swaps that glass
  // for a dark, inert one, rather than showing a second, permanently disabled copy beside it.
  const launcher = useRef<HTMLButtonElement>(null)
  const launcherSize = useMeasure(launcher, { width: 0, height: 0 })
  const [launcherDisabled, setLauncherDisabled] = useState(false)
  const scheme = useResolvedTheme()
  const other: 'dark' | 'light' = scheme === 'dark' ? 'light' : 'dark'
  const setTheme = useThemeStore((st) => st.setTheme)
  // Real glass on a dark page is dark; the label follows the page's ink, as the banner's does.
  const { ink } = useInk()
  const glassInk = ready ? ink : undefined
  const onAnnouncementSlot = useCallback((slot: SlotBox) => setAnnouncement(slot), [])
  const onCalloutSlot = useCallback(
    (el: HTMLDivElement | null, size: { width: number; height: number }, glyph: THREE.Texture | null) =>
      setCallout({ el, ...size, glyph }),
    [],
  )
  // The pill is centred on the DOM nav's padded box (its clusters bleed inside it).
  const setNavWrap = useCallback((node: HTMLDivElement | null) => {
    navWrap.current = node
    navEl.current = node?.querySelector('nav') ?? null
  }, [])

  return (
    <NavStoreContext.Provider value={store}>
      {client && (
        <BentoScene
          eventSource={pageRef}
          navEl={navEl}
          announcement={announcement}
          callout={{ ...callout, kind: 'note' }}
          glassBacked={[{ el: launcher, ...launcherSize, radius: 4, preset: launcherDisabled ? 'dark' : undefined }]}
          onReady={() => setReady(true)}
        />
      )}
      <main ref={pageRef} className={styles.page} style={{ position: 'relative', zIndex: 1 }}>
        {/* One centred column, in the order a reader meets the elements: the banner over the
            bar, then the things you use, then the plain controls. */}
        <section className={styles.tier}>
          <div className={styles.col}>
            <div className={styles.cell} style={{ maxWidth: 720 }}>
              <Announcement variant="shared" sharedReady={ready} onSlot={onAnnouncementSlot} width={720}>
                <span>
                  <strong>v10 is out.</strong> Petals, glass and the growing pill, in one package.
                </span>
                <a href="/blog/v10">Read more</a>
              </Announcement>
            </div>
            <div className={styles.cell} style={{ maxWidth: 620 }}>
              {/* data-3d hides the DOM nav's visuals once the scene draws the pill; anchors stay. */}
              <div ref={setNavWrap} data-3d={ready || undefined} style={{ width: '100%' }}>
                <Nav2D links={LINKS} vector={!ready} />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.tier}>
          <div className={styles.col}>
            <div className={`${styles.cell} ${styles.fit}`} style={{ maxWidth: 520 }}>
              <CopyButton
                value="pnpm add @react-three/fiber"
                actions={[
                  { key: 'docs', label: 'Open the docs', icon: <InfoIcon />, href: '/docs' },
                  { key: 'sandbox', label: 'Open a sandbox', icon: <ExternalIcon />, href: '/examples' },
                  { key: 'repo', label: 'View the repository', icon: <GitHubIcon />, href: 'https://github.com/pmndrs' },
                  { key: 'run', label: 'Run it', icon: <BoltIcon /> },
                  { key: 'cli', label: 'Copy the CLI command', icon: <TerminalIcon /> },
                ]}
              />
            </div>
            <div className={styles.cell} style={{ maxWidth: 560 }}>
              <Callout variant="shared" sharedReady={ready} onSlot={onCalloutSlot} kind="note" title="Callout" maxWidth={560}>
                <p>
                  A 3D glass surface behind DOM content: the lens carries the kind's symbol, the text
                  stays selectable and wraps.
                </p>
              </Callout>
            </div>
            <div className={`${styles.cell} ${styles.fit}`} style={{ maxWidth: 320 }}>
              <button
                ref={launcher}
                type="button"
                className={styles.launcher}
                data-3d={ready || undefined}
                style={{ color: glassInk }}
                // aria-disabled rather than disabled: it stays focusable and announced, so a
                // keyboard user can find it and hear that it is off rather than lose it.
                aria-disabled={launcherDisabled || undefined}
                onClick={() => {
                  if (!launcherDisabled) setTheme(other)
                }}
              >
                {other === 'dark' ? <MoonIcon /> : <SunIcon />}
                {other === 'dark' ? 'Apply Dark Theme' : 'Apply Light Theme'}
              </button>
            </div>
            <button type="button" className={styles.textButton} onClick={() => setLauncherDisabled((d) => !d)}>
              {launcherDisabled ? 'Enable Theme Switcher' : 'Disable Theme Switcher'}
            </button>
          </div>
        </section>

        <section className={styles.tier}>
          <div className={styles.col}>
            <div className={styles.inline}>
              <Button onClick={() => document.querySelector<HTMLElement>('[data-id="cmd"]')?.click()}>
                Cmd <Kbd>K</Kbd>
              </Button>
              <Popover
                label="Open"
                items={[
                  { key: 'github', label: 'Open in GitHub', href: 'https://github.com/pmndrs' },
                  { key: 'chatgpt', label: 'Open in ChatGPT', href: 'https://chat.openai.com' },
                  { key: 'claude', label: 'Open in Claude', href: 'https://claude.ai' },
                  { key: 'cursor', label: 'Open in Cursor', href: 'https://cursor.com' },
                ]}
              />
            </div>
            <div className={styles.inline}>
              <ButtonLink icon href="https://twitter.com/pmndrs" aria-label="Twitter">
                <TwitterIcon />
              </ButtonLink>
              <ButtonLink icon href="https://discord.gg/poimandres" aria-label="Discord">
                <DiscordIcon />
              </ButtonLink>
              <ButtonLink icon href="https://github.com/pmndrs" aria-label="GitHub">
                <GitHubIcon />
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      {DevControls && (
        <Suspense fallback={null}>
          <DevControls />
        </Suspense>
      )}
    </NavStoreContext.Provider>
  )
}
