import { lazy, Suspense } from 'react'
import { NavCanvas } from './Canvas'
import { Ready } from './Ready'
import { NavRoot } from './NavRoot'
import { preloadNavAssets } from './assets'

// Kick off the GLB fetches the moment this chunk is evaluated (before React mounts the scene).
preloadNavAssets()

// Dev-only tuning panel + inspection handle. The dynamic imports sit behind a constant
// condition, so neither chunk is emitted in production builds.
const DevControls = import.meta.env.DEV ? lazy(() => import('./DevControls')) : null
const DevHandles = import.meta.env.DEV ? lazy(() => import('./DevHandles')) : null

export interface Nav3DProps {
  /** Disable postprocessing for low-tier GPUs. */
  postprocessing?: boolean
  /** Called once, after the first frame that has the assets and layout in place. */
  onReady?: () => void
}

export default function Nav3D({ postprocessing = true, onReady }: Nav3DProps) {
  return (
    <>
      <NavCanvas postprocessing={postprocessing}>
        <NavRoot />
        <Ready onReady={onReady} />
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
