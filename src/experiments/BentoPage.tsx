import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { Nav2D } from '../nav/Nav2D'
import { createNavStore, NavStoreContext } from '../nav/store'
import type { NavLink } from '../nav/types'
import { Logo } from '../nav/Logo'
import { Announcement } from './Announcement'
import { Callout } from './Callout'
import { BentoScene, type SlotBox } from './BentoScene'
import { useIsClient } from '../isClient'
import styles from './Bento.module.css'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null

const LINKS: NavLink[] = [
  { id: 'docs', label: 'Docs', href: '/docs' },
  { id: 'examples', label: 'Examples', href: '/examples' },
  { id: 'blog', label: 'Blog', href: '/blog' },
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
  const onAnnouncementSlot = useCallback((el: HTMLDivElement | null, size: { width: number; height: number }) => setAnnouncement({ el, ...size }), [])
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
            <CopyButton text="pnpm add @react-three/fiber" />
            <button type="button" className={styles.glass} style={{ flexBasis: '100%', maxWidth: 240, justifyContent: 'center' }}>
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
            <button
              type="button"
              className={styles.glass}
              onClick={() => document.querySelector<HTMLElement>('[data-id="cmd"]')?.click()}
            >
              Cmd <span className={styles.kbd}>K</span>
            </button>
            <a className={`${styles.glass} ${styles.icon}`} href="https://twitter.com/pmndrs" aria-label="Twitter">
              TW
            </a>
            <a className={`${styles.glass} ${styles.icon}`} href="https://discord.gg/poimandres" aria-label="Discord">
              DI
            </a>
            <a className={`${styles.glass} ${styles.icon}`} href="https://github.com/pmndrs" aria-label="GitHub">
              GH
            </a>
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

/** Copies `text` and shows "Copied!" for a moment, as the wireframe's pair of states. */
function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className={`${styles.glass} ${done ? styles.done : ''}`}
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {})
        setDone(true)
        window.setTimeout(() => setDone(false), 1600)
      }}
      aria-live="polite"
    >
      {done ? 'Copied!' : 'Copy'}
    </button>
  )
}
