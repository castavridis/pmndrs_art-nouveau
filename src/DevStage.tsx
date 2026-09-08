import { lazy, Suspense, useState } from 'react'
import { createNavStore, NavStoreContext } from './nav/store'
import type { NavLink } from './nav/types'

const Stage3D = lazy(() => import('./nav/Nav3D/Stage'))

const LINKS: NavLink[] = [
  { id: 'docs', label: 'Docs', href: '/docs' },
  { id: 'examples', label: 'Examples', href: '/examples' },
  { id: 'blog', label: 'Blog', href: '/blog' },
]

/**
 * `/dev/stage`: the 3D nav alone in a full-viewport canvas with orbit/zoom/pan controls and
 * the leva panel, for tuning lights and materials. Drag to orbit, wheel to zoom, right-drag
 * to pan; `lights › debug` draws the light helpers.
 */
export function DevStage() {
  const [store] = useState(() => createNavStore({ links: LINKS }))
  return (
    <NavStoreContext.Provider value={store}>
      <div style={{ position: 'fixed', inset: 0 }}>
        <Suspense fallback={null}>
          <Stage3D />
        </Suspense>
      </div>
    </NavStoreContext.Provider>
  )
}
