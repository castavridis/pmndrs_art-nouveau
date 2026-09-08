import { lazy, Suspense, useState, type ReactNode } from 'react'
import { createNavStore, NavStoreContext } from '../nav/store'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { RecenterButton } from '../nav/Nav3D/recenter'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null
const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null

export interface ExperimentShellProps {
  /** Initial camera position (world units). */
  frame?: [number, number, number]
  /** DOM overlay (titles, buttons). */
  overlay?: ReactNode
  children: ReactNode
}

/** Full-viewport orbitable canvas with the tuning panel and re-center, for the experiments. */
export function ExperimentShell({ frame = [0, 0.5, 12], overlay, children }: ExperimentShellProps) {
  const [store] = useState(() => createNavStore({ links: [] }))
  return (
    <NavStoreContext.Provider value={store}>
      <div style={{ position: 'fixed', inset: 0 }}>
        <NavCanvas orbit framePosition={frame}>
          <Suspense fallback={null}>{children}</Suspense>
          {DevHandles && (
            <Suspense fallback={null}>
              <DevHandles />
            </Suspense>
          )}
        </NavCanvas>
        {overlay}
        <RecenterButton />
        {DevControls && (
          <Suspense fallback={null}>
            <DevControls />
          </Suspense>
        )}
      </div>
    </NavStoreContext.Provider>
  )
}
