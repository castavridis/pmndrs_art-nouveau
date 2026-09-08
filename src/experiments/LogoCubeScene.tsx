import { lazy, Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { NavCanvas } from '../nav/Nav3D/Canvas'
import { Glass } from '../nav/Nav3D/Glass'
import { TUNING_KEY, useTuning } from '../nav/Nav3D/tuning'
import { preloadNavAssets } from '../nav/Nav3D/assets'
import { preloadLogoCube, useLogoCube } from './logoCubeAssets'
import { makeLogoGeometry } from './logoBlocks'
import { Flowers, Inside, Outside } from './Inside'
import { preloadFlower } from './flowerAssets'

const DevControls = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevControls')) : null
const DevHandles = import.meta.env.DEV ? lazy(() => import('../nav/Nav3D/DevHandles')) : null

preloadNavAssets()
preloadFlower()
/** `?glb` shows the exported mesh instead of the procedural prisms. */
const USE_GLB = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('glb')
if (USE_GLB) preloadLogoCube()

/** The model is ~8 units tall; with the 22° camera that needs ~21 units of distance to fit. */
const CAMERA: [number, number, number] = [0, 0.4, 26]

export default function LogoCubeScene() {
  // This page has its own persisted tuning (TUNING_KEY). On the first visit, start from the
  // clear-glass preset and a lighter backdrop instead of the nav's milky defaults.
  useEffect(() => {
    let fresh = true
    try {
      fresh = !localStorage.getItem(TUNING_KEY)
    } catch {
      /* no storage: treat as fresh */
    }
    if (!fresh) return
    const st = useTuning.getState()
    st.applyPreset('clearCube')
    st.set('env', { intensity: 1, background: '#a0a3b0' })
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
  return <Logo geometry={geometry} boxes={boxes} />
}

function MeshModel() {
  const { geometry, boxes } = useLogoCube()
  return <Logo geometry={geometry} boxes={boxes} />
}

function Logo({ geometry, boxes }: { geometry: THREE.BufferGeometry; boxes: THREE.Box3[] }) {
  const bounds = useMemo(() => geometry.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geometry.attributes.position as THREE.BufferAttribute), [geometry])
  return (
    <>
      <mesh geometry={geometry}>
        <Glass />
      </mesh>
      <Inside boxes={boxes} />
      <Outside bounds={bounds} />
      <Flowers boxes={boxes} bounds={bounds} />
    </>
  )
}
