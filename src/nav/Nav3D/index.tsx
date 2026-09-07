import { lazy, Suspense } from 'react'
import { NavCanvas } from './Canvas'
import { Pill } from './Pill'

// Dev-only tuning panel. The dynamic import sits behind a constant condition, so the
// leva chunk is never emitted in production builds.
const DevControls = import.meta.env.DEV ? lazy(() => import('./DevControls')) : null
const DevHandles = import.meta.env.DEV ? lazy(() => import('./DevHandles')) : null

export interface Nav3DProps {
  /** Disable postprocessing for low-tier GPUs. */
  postprocessing?: boolean
  /** Temporary until Task 3 derives the width from measured content. */
  width?: number
}

export default function Nav3D({ postprocessing = true, width = 560 }: Nav3DProps) {
  return (
    <>
      <NavCanvas postprocessing={postprocessing}>
        <Pill width={width} />
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
