import { lazy, Suspense, useEffect, useState } from 'react'
import { createNavStore, NavStoreContext } from '../nav/store'
import { useCubeScene } from './cubeScene'
import { LogoCubeVector } from './LogoCubeVector'
import { useOutlines } from '../nav/outlines'

const Scene = lazy(() => import('./LogoCubeScene'))
// The panel lives here, outside the scene, so it stays available while svg mode hides the 3D.
const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null
const CubeControls = import.meta.env.DEV ? lazy(() => import('./CubeControls')) : null

/**
 * `/dev/cube`: the "logo cubed" model front and centre in a full-viewport canvas with orbit
 * controls, petals (and a few palette shapes) floating inside the glass blocks.
 * Shares the nav's canvas, lights, materials and leva tuning.
 */
export function LogoCube() {
  const [store] = useState(() => createNavStore({ links: [] }))
  const svg = useCubeScene((s) => s.svg)
  const overlay = useOutlines((s) => s.overlay)
  // `?svg` forces vector mode for this visit; the panel's "svg mode" is remembered otherwise.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('svg')) useCubeScene.getState().set({ svg: true })
  }, [])
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
        <LogoCubeVector visible={svg || overlay || !ready} />
        {DevControls && CubeControls && (
          <Suspense fallback={null}>
            <DevControls />
            <CubeControls />
          </Suspense>
        )}
      </div>
    </NavStoreContext.Provider>
  )
}
