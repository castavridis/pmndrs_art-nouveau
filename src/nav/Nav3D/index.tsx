import { lazy, Suspense } from 'react'
import { NavCanvas } from './Canvas'
import { NavRoot } from './NavRoot'

// Dev-only tuning panel + inspection handle. The dynamic imports sit behind a constant
// condition, so neither chunk is emitted in production builds.
const DevControls = import.meta.env.DEV ? lazy(() => import('./DevControls')) : null
const DevHandles = import.meta.env.DEV ? lazy(() => import('./DevHandles')) : null

export interface Nav3DProps {
  /** Disable postprocessing for low-tier GPUs. */
  postprocessing?: boolean
}

export default function Nav3D({ postprocessing = true }: Nav3DProps) {
  return (
    <>
      <NavCanvas postprocessing={postprocessing}>
        <NavRoot />
        {DevHandles && (
          <Suspense fallback={null}>
            <DevHandles />
          </Suspense>
        )}
      </NavCanvas>
      {DevControls && (
        <Suspense fallback={null}>
          <DevControls />
        </Suspense>
      )}
    </>
  )
}
