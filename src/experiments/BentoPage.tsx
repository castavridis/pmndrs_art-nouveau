import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { Nav2D } from '../nav/Nav2D'
import { createNavStore, NavStoreContext } from '../nav/store'
import type { NavLink } from '../nav/types'
import { Logo } from '../nav/Logo'
import { Announcement } from './Announcement'
import { Callout } from './Callout'
import { BentoScene, type SlotBox } from './BentoScene'
import { Button, ButtonLink, CopyButton, Kbd, Popover } from '../ui'
import { BoltIcon, DiscordIcon, ExternalIcon, GitHubIcon, InfoIcon, TerminalIcon, TwitterIcon } from '../ui/Icons'
import type { Shatter } from './Announcement'
import type * as THREE from 'three'
import { useIsClient } from '../isClient'
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
 * `/dev/bento`: the components laid out by how expressive they are, all drawn by ONE scene
 * (BentoScene) behind the page: the nav, the announcement slab and the callout surface share
 * petals, lights and postprocessing. The DOM stays the source of truth for layout and text;
 * the 3D parts follow their DOM slots.
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
  const onAnnouncementSlot = useCallback(
    (slot: { el: HTMLDivElement | null; width: number; height: number; shatter: Shatter | null; print: THREE.Texture | null; ink: string }) =>
      setAnnouncement(slot),
    [],
  )
  const onCalloutSlot = useCallback((el: HTMLDivElement | null, size: { width: number; height: number }) => setCallout({ el, ...size }), [])
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
          onReady={() => setReady(true)}
        />
      )}
      <main ref={pageRef} className={styles.page} style={{ position: 'relative', zIndex: 1 }}>
        <section className={styles.tier} aria-labelledby="tier-most">
          <h2 id="tier-most" className={styles.heading}>
            Most Expressive
          </h2>
          <div className={styles.left} style={{ alignItems: 'center' }}>
            {/* data-3d hides the DOM nav's visuals once the scene draws the pill; anchors stay. */}
            <div ref={setNavWrap} data-3d={ready || undefined} style={{ width: '100%' }}>
              <Nav2D links={LINKS} vector={!ready} />
            </div>
          </div>
          <div className={styles.right}>
            <Announcement variant="shared" sharedReady={ready} onSlot={onAnnouncementSlot} width={720}>
              <span>
                <strong>v10 is out.</strong> Petals, glass and the growing pill, in one package.
              </span>
              <a href="/blog/v10">Read more</a>
            </Announcement>
          </div>
        </section>

        <section className={styles.tier} aria-labelledby="tier-some">
          <h2 id="tier-some" className={styles.heading}>
            Somewhat Expressive
          </h2>
          <div className={styles.left}>
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
            <button type="button" className={styles.launcher}>
              Article Launcher
            </button>
            <button type="button" className={styles.launcher} disabled>
              Article Launcher
            </button>
          </div>
          <div className={styles.right}>
            <Callout variant="shared" sharedReady={ready} onSlot={onCalloutSlot} kind="note" title="Callout" maxWidth={720}>
              <p>
                A 3D glass surface behind DOM content: the lens carries the kind's symbol, the text
                stays selectable and wraps.
              </p>
            </Callout>
          </div>
        </section>

        <section className={styles.tier} aria-labelledby="tier-util">
          <h2 id="tier-util" className={styles.heading}>
            Utilitarian
          </h2>
          <div className={styles.left}>
            <Button onClick={() => document.querySelector<HTMLElement>('[data-id="cmd"]')?.click()}>
              Cmd <Kbd>K</Kbd>
            </Button>
            <ButtonLink icon href="https://twitter.com/pmndrs" aria-label="Twitter">
              <TwitterIcon />
            </ButtonLink>
            <ButtonLink icon href="https://discord.gg/poimandres" aria-label="Discord">
              <DiscordIcon />
            </ButtonLink>
            <ButtonLink icon href="https://github.com/pmndrs" aria-label="GitHub">
              <GitHubIcon />
            </ButtonLink>
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
          <div className={styles.right}>
            <nav className={styles.docs} aria-label="Docs">
              <div className={styles.docsNav}>
                <a href="/" aria-label="pmndrs home">
                  <Logo width={20} height={20} />
                </a>
                <a href="/docs/fiber">React Three Fiber</a>
                <a href="/docs/fiber/introduction" aria-current="page">
                  Introduction
                </a>
              </div>
              <div className={styles.docsBody}>
                <ul>
                  <li>Does it have limitations?</li>
                  <li>Point 2</li>
                  <li>Point 3</li>
                </ul>
              </div>
            </nav>
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
