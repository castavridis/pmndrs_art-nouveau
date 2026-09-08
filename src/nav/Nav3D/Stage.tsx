import { lazy, Suspense } from 'react'
import { RecenterButton } from './recenter'
import { NavCanvas } from './Canvas'
import { NavRoot } from './NavRoot'

const DevControls = import.meta.env.DEV ? lazy(() => import('./DevControls')) : null
const DevHandles = import.meta.env.DEV ? lazy(() => import('./DevHandles')) : null

/** Full-size, orbitable version of the nav scene for the dev stage. */
export default function Stage() {
  return (
    <>
      <NavCanvas orbit>
        <NavRoot />
        {DevHandles && (
          <Suspense fallback={null}>
            <DevHandles />
          </Suspense>
        )}
      </NavCanvas>
      <RecenterButton />
      {DevControls && (
        <Suspense fallback={null}>
          <DevControls />
        </Suspense>
      )}
    </>
  )
}
