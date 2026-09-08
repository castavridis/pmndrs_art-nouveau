import { lazy, Suspense, useState } from 'react'
import { createNavStore, NavStoreContext } from '../nav/store'
import { useCubeScene } from './cubeScene'
import { LogoCubeVector } from './LogoCubeVector'

const Scene = lazy(() => import('./LogoCubeScene'))

/**
 * `/dev/cube`: the "logo cubed" model front and centre in a full-viewport canvas with orbit
 * controls, petals (and a few palette shapes) floating inside the glass blocks.
 * Shares the nav's canvas, lights, materials and leva tuning.
 */
export function LogoCube() {
  const [store] = useState(() => createNavStore({ links: [] }))
  const svg = useCubeScene((s) => s.svg)
  // Vector outlines stand in until the 3D has rendered, and stay when svg mode is on
  // (leva "scene → svg mode", or `?svg`).
  const [ready, setReady] = useState(false)
  return (
    <NavStoreContext.Provider value={store}>
      <div style={{ position: 'fixed', inset: 0 }}>
        {!svg && (
          <div style={{ position: 'absolute', inset: 0, opacity: ready ? 1 : 0, transition: 'opacity 600ms ease' }}>
            <Suspense fallback={null}>
              <Scene onReady={() => setReady(true)} />
            </Suspense>
          </div>
        )}
        <LogoCubeVector visible={svg || !ready} />
      </div>
    </NavStoreContext.Provider>
  )
}
