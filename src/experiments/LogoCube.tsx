import { lazy, Suspense, useState } from 'react'
import { createNavStore, NavStoreContext } from '../nav/store'

const Scene = lazy(() => import('./LogoCubeScene'))

/**
 * `/dev/cube`: the "logo cubed" model front and centre in a full-viewport canvas with orbit
 * controls, petals (and a few palette shapes) floating inside the glass blocks.
 * Shares the nav's canvas, lights, materials and leva tuning.
 */
export function LogoCube() {
  const [store] = useState(() => createNavStore({ links: [] }))
  return (
    <NavStoreContext.Provider value={store}>
      <div style={{ position: 'fixed', inset: 0 }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </div>
    </NavStoreContext.Provider>
  )
}
