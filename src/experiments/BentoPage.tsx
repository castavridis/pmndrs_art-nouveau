import { useState } from 'react'
import { Nav } from '../nav'
import type { NavLink } from '../nav/types'
import { Logo } from '../nav/Logo'
import { Announcement } from './Announcement'
import { Callout } from './Callout'
import { useIsClient } from '../isClient'
import styles from './Bento.module.css'

const LINKS: NavLink[] = [
  { id: 'docs', label: 'Docs', href: '/docs' },
  { id: 'examples', label: 'Examples', href: '/examples' },
  { id: 'blog', label: 'Blog', href: '/blog' },
]

/**
 * `/dev/bento`: the components laid out by how expressive they are. The most expressive tier
 * is 3D (nav, announcement); the middle tier mixes a 3D surface with glass-styled DOM
 * controls; the utilitarian tier is plain DOM.
 */
export function BentoPage() {
  const client = useIsClient()
  return (
    <main className={styles.page}>
      <section className={styles.tier} aria-labelledby="tier-most">
        <h2 id="tier-most" className={styles.heading}>
          Most Expressive
        </h2>
        <div className={styles.left} style={{ alignItems: 'center' }}>
          <div style={{ width: '100%' }}>
            <Nav links={LINKS} active="docs" />
          </div>
        </div>
        <div className={styles.right}>
          <Announcement variant={client ? '3d' : 'svg'} width={720}>
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
          <Callout variant={client ? 'surface' : 'svg'} kind="note" title="Callout" maxWidth={720}>
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
