import { Nav } from './nav'
import type { NavLink } from './nav/types'
import type { EnhancementLevel } from './nav/Nav'

const ALL: NavLink[] = [
  { id: 'docs', label: 'Docs', href: '/docs' },
  { id: 'examples', label: 'Examples', href: '/examples' },
  { id: 'blog', label: 'Blog', href: '/blog' },
  { id: 'ecosystem', label: 'Ecosystem', href: '/ecosystem' },
  { id: 'showcase', label: 'Showcase', href: '/showcase' },
  { id: 'community', label: 'Community', href: '/community' },
  { id: 'sponsors', label: 'Sponsors', href: '/sponsors' },
  { id: 'jobs', label: 'Jobs', href: '/jobs' },
  { id: 'about', label: 'About', href: '/about' },
  { id: 'contact', label: 'Contact', href: '/contact' },
]

type Mode = 'full' | 'compact' | 'collapsed'
const MODES: Mode[] = ['full', 'compact', 'collapsed']

/**
 * Required container width (px, incl. cluster bleed) per mode for each link count, measured
 * with `node scripts/dev/measure-req.mjs` (re-run after changing tokens or link labels).
 * The mode is a consequence of the width, so a cell just needs to sit inside the right band.
 */
const REQUIRED: Record<number, { full: number; compact: number }> = {
  1: { full: 397, compact: 292 },
  3: { full: 581, compact: 431 },
  6: { full: 955, compact: 723 },
  10: { full: 1323, compact: 1003 },
}
const widthFor = (mode: Mode, n: number) => {
  const r = REQUIRED[n] ?? { full: 252 + 98 * n, compact: 237 + 75 * n }
  return mode === 'full' ? r.full + 40 : mode === 'compact' ? Math.round((r.compact + r.full) / 2) : r.compact - 30
}

/**
 * `/dev/nav`: every link count × every mode side by side. The mode is a consequence of the
 * container width, so each cell is a fixed-width box. Cells are 2D by default (one WebGL
 * context each would exhaust the browser); the last row shows the 3D nav in all three modes.
 */
export function DevGallery() {
  const counts = [1, 3, 6, 10]
  return (
    <main style={{ padding: 32, display: 'grid', gap: 40 }}>
      <h1 style={{ margin: 0, fontSize: 18, fontWeight: 500, opacity: 0.7 }}>nav gallery</h1>
      {counts.map((n) => (
        <Row key={n} title={`${n} link${n > 1 ? 's' : ''} · 2D`} links={ALL.slice(0, n)} enhancement="2d" />
      ))}
      <Row title="3 links · 3D" links={ALL.slice(0, 3)} enhancement="3d" />
    </main>
  )
}

function Row({ title, links, enhancement }: { title: string; links: NavLink[]; enhancement: EnhancementLevel }) {
  return (
    <section aria-label={title} style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500, opacity: 0.6 }}>{title}</h2>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8 }}>
        {MODES.map((m) => (
          <div key={m} style={{ flex: 'none', width: widthFor(m, links.length), outline: '1px dashed #444', outlineOffset: 6 }}>
            <Nav links={links} enhancement={enhancement} />
          </div>
        ))}
      </div>
    </section>
  )
}
