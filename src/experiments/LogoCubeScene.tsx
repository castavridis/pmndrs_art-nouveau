import { lazy, Suspense, useEffect, useMemo } from 'react'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { glassPresets, useTuning } from '../nav/Nav3D/tuning'
import { preloadNavAssets } from '../nav/Nav3D/assets'
import { preloadLogoCube, useLogoCube } from './logoCubeAssets'
import { makeLogoGeometry } from './logoBlocks'
import { Inside } from './Inside'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null
const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null

preloadNavAssets()
/** `?glb` shows the exported mesh instead of the procedural prisms. */
const USE_GLB = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('glb')
if (USE_GLB) preloadLogoCube()

/** The model is ~8 units tall; with the 22° camera that needs ~21 units of distance to fit. */
const CAMERA: [number, number, number] = [0, 0.4, 26]

export default function LogoCubeScene() {
  // Start from the clear-glass preset unless the user has already tuned the glass away from
  // the nav's default (the tuning store is shared and persisted per browser).
  useEffect(() => {
    const st = useTuning.getState()
    if (JSON.stringify(st.glass) === JSON.stringify(glassPresets.roughGlass)) {
      st.applyPreset('clearCube')
      // A lighter backdrop so the bevels catch something; the nav's default is much darker.
      st.set('env', { intensity: 1, background: '#a0a3b0' })
    }
  }, [])
  return (
    <>
      <NavCanvas orbit framePosition={CAMERA}>
        <Suspense fallback={null}>{USE_GLB ? <MeshModel /> : <PrismModel />}</Suspense>
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

/** The logo built from rounded prisms (no GLB): see logoBlocks.ts. */
function PrismModel() {
  const { geometry, boxes } = useMemo(() => makeLogoGeometry(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <>
      <mesh geometry={geometry}>
        <Glass />
      </mesh>
      <Inside boxes={boxes} />
    </>
  )
}

function MeshModel() {
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
