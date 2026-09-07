import { lazy, Suspense, useMemo, useState } from 'react'
import { Nav } from './nav'
import type { NavLink } from './nav/types'
import { tokens } from './nav/tokens'

// Dev preview of the 3D layer; Task 6 moves this behind Nav's GPU gate.
const Nav3D = lazy(() => import('./nav/Nav3D'))

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

export function App() {
  const [count, setCount] = useState(3)
  const [width, setWidth] = useState(100)
  const [show3D, setShow3D] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('3d'),
  )
  const [post, setPost] = useState(true)
  const links = useMemo(() => ALL.slice(0, count), [count])

  return (
    <main style={{ padding: '48px 16px', display: 'grid', gap: 48 }}>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        pmndrs nav demo
      </h1>
      <header style={{ width: `${width}%`, margin: '0 auto', outline: '1px dashed #444', outlineOffset: 8 }}>
        <Nav links={links} />
      </header>

      <section aria-label="Dev controls" style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', fontSize: 14 }}>
        <label>
          Links: <output>{count}</output>{' '}
          <input type="range" min={1} max={ALL.length} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </label>
        <label>
          Container: <output>{width}%</output>{' '}
          <input type="range" min={20} max={100} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
        </label>
        <label>
          <input type="checkbox" checked={show3D} onChange={(e) => setShow3D(e.target.checked)} /> 3D preview
        </label>
        <label>
          <input type="checkbox" checked={post} onChange={(e) => setPost(e.target.checked)} /> postprocessing
        </label>
      </section>

      {show3D && (
        <section
          aria-label="3D preview"
          style={{
            width: `${width}%`,
            margin: '0 auto',
            height: tokens.pillHeight + tokens.clusterBleedY * 2,
            outline: '1px dashed #444',
            outlineOffset: 8,
          }}
        >
          <Suspense fallback={null}>
            <Nav3D postprocessing={post} />
          </Suspense>
        </section>
      )}
    </main>
  )
}
