import { lazy, Suspense, useEffect } from 'react'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { glassPresets, useTuning } from '../nav/Nav3D/tuning'
import { preloadNavAssets } from '../nav/Nav3D/assets'
import { preloadLogoCube, useLogoCube } from './logoCubeAssets'
import { Inside } from './Inside'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null
const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null

preloadLogoCube()
preloadNavAssets()

/** The model is ~8 units tall; with the 22° camera that needs ~21 units of distance to fit. */
const CAMERA: [number, number, number] = [0, 0.4, 26]

export default function LogoCubeScene() {
  // Start from the clear-glass preset unless the user has already tuned the glass away from
  // the nav's default (the tuning store is shared and persisted per browser).
  useEffect(() => {
    const st = useTuning.getState()
    if (JSON.stringify(st.glass) === JSON.stringify(glassPresets.roughGlass)) st.applyPreset('clearCube')
  }, [])
  return (
    <>
      <NavCanvas orbit framePosition={CAMERA}>
        <Suspense fallback={null}>
          <Model />
        </Suspense>
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

function Model() {
  const { geometry, boxes } = useLogoCube()
  return (
    <>
      <mesh geometry={geometry}>
        <Glass />
      </mesh>
      <Inside boxes={boxes} />
    </>
  )
}
