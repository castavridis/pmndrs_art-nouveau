import { Nav } from './nav'
import type { NavLink } from './nav/types'
import { Announcement } from './experiments/Announcement'
import { Callout } from './experiments/Callout'
import { useIsClient } from './isClient'

const LINKS: NavLink[] = [
  { id: 'docs', label: 'Docs', href: '/docs' },
  { id: 'examples', label: 'Examples', href: '/examples' },
  { id: 'blog', label: 'Blog', href: '/blog' },
]

/**
 * `/`: the site home. The nav, an announcement banner and two callouts, all sharing the
 * iridescent glass. Everything renders as DOM (and traced vector outlines) first; the 3D
 * layers arrive after mount and cross-fade in.
 */
export function Home() {
  const client = useIsClient()
  return (
    <>
      <header style={{ padding: '72px 8px 0' }}>
        <Nav links={LINKS} />
      </header>
      <main
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: 'clamp(32px, 6vw, 48px) clamp(16px, 4vw, 24px) 96px',
          display: 'grid',
          gap: 'clamp(40px, 7vw, 56px)',
        }}
      >
        <section aria-label="Announcement" style={{ display: 'grid', justifyItems: 'center' }}>
          <Announcement width={652} variant={client ? '3d' : 'svg'}>
            <span>
              <strong>v10 is out.</strong> Petals, glass and the growing pill, in one package.
            </span>
            <a href="/blog/v10">Read more</a>
          </Announcement>
        </section>
        <section style={{ display: 'grid', gap: 16 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(28px, 8vw, 40px)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            React, three and a garden of glass.
          </h1>
          <p style={{ margin: 0, fontSize: 'clamp(16px, 4.5vw, 18px)', lineHeight: 1.5, opacity: 0.75, maxWidth: 640 }}>
            The pmndrs collective builds the tools that make 3D on the web feel like the rest of
            your app: a renderer that speaks React, layout that flexes, springs that settle.
          </p>
        </section>
        <section aria-label="Callouts" style={{ display: 'grid', gap: 32, justifyItems: 'center' }}>
          <Callout
            variant={client ? 'surface' : 'svg'}
            kind="tip"
            title="Start with the fiber docs"
          >
            <p>
              Everything here is built from the same primitives you already know: components, hooks
              and props.
            </p>
          </Callout>
          <Callout variant={client ? 'plain' : 'svg'} kind="warning" title="Big models load lazily">
            <p>
              The 3D layers ship as separate chunks. Vector outlines stand in until the models have
              rendered.
            </p>
          </Callout>
        </section>
        <footer style={{ display: 'flex', justifyContent: 'center', fontSize: 14, opacity: 0.7 }}>
          <a href="/dev/" style={{ color: 'inherit', textUnderlineOffset: 3 }}>
            Experiments and tuning pages →
          </a>
        </footer>
      </main>
    </>
  )
}
