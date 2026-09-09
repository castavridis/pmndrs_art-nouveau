import { Suspense, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { createNavStore, NavStoreContext } from '../nav/store'
import { useNavAssets } from '../nav/Nav3D/assets'
import { tokens } from '../nav/tokens'
import { useFlower } from './flowerAssets'
import { makeLogoGeometry } from './logoBlocks'
import { useCalloutIcon } from './calloutAssets'
import { useAnnouncementAssets } from './announcementAssets'

declare global {
  interface Window {
    /** Set by the trace page once the asset is rendered: bounds in CSS px of nav space. */
    __trace?: {
      asset: string
      width: number
      height: number
      originX: number
      originY: number
      canvas: number
    }
  }
}

import type { TraceAsset } from './traceAssets'

/** Canvas size in device pixels; the asset is fitted into it with a margin. */
const CANVAS = 1600

/**
 * `/dev/trace?asset=<name>`: one component, flat white, orthographic, transparent, filling a
 * square canvas. scripts/trace-svgs.mjs reads the canvas, traces the alpha edge and writes
 * an SVG fallback with the asset's px size and origin (window.__trace).
 */
export function TracePage() {
  const [store] = useState(() => createNavStore({ links: [] }))
  const asset = (new URLSearchParams(window.location.search).get('asset') ??
    'nav-left') as TraceAsset
  return (
    <NavStoreContext.Provider value={store}>
      <div style={{ width: CANVAS, height: CANVAS, background: 'transparent' }}>
        <Canvas
          orthographic
          dpr={1}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <Subject asset={asset} />
          </Suspense>
        </Canvas>
      </div>
    </NavStoreContext.Provider>
  )
}

function useSubjectGeometry(asset: TraceAsset): THREE.BufferGeometry {
  const nav = useNavAssets()
  const flower = useFlower()
  const icon = useCalloutIcon()
  const ann = useAnnouncementAssets()
  return useMemo(() => {
    switch (asset) {
      case 'nav-left':
        return nav.left
      case 'nav-right':
        return nav.right
      case 'petal':
        return nav.petal
      case 'flower':
        return flower
      case 'logo-cube':
        return makeLogoGeometry().geometry
      case 'callout-icon':
        return mergeGeometries([icon.lens, icon.leafTop, icon.leafBottom])
      case 'announcement-left':
        return ann.left
      case 'announcement-right':
        return ann.right
    }
  }, [asset, nav, flower, icon, ann])
}

function Subject({ asset }: { asset: TraceAsset }) {
  const geometry = useSubjectGeometry(asset)
  const frame = useMemo(() => {
    geometry.computeBoundingBox()
    const bb = geometry.boundingBox!
    const size = bb.getSize(new THREE.Vector3())
    const centre = bb.getCenter(new THREE.Vector3())
    const extent = Math.max(size.x, size.y) * 1.08
    const p = tokens.pxPerUnit
    return {
      left: centre.x - extent / 2,
      right: centre.x + extent / 2,
      top: centre.y + extent / 2,
      bottom: centre.y - extent / 2,
      // px metrics: the asset's size and where its origin sits inside its own bounds
      info: {
        asset,
        width: size.x * p,
        height: size.y * p,
        originX: -bb.min.x * p,
        originY: bb.max.y * p,
        canvas: CANVAS,
      },
    }
  }, [geometry, asset])
  useEffect(() => {
    window.__trace = frame.info
  }, [frame])
  return (
    <>
      <OrthographicCamera
        makeDefault
        manual
        left={frame.left}
        right={frame.right}
        top={frame.top}
        bottom={frame.bottom}
        near={-100}
        far={100}
        position={[0, 0, 10]}
      />
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </>
  )
}

function mergeGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  let offset = 0
  for (const g of list) {
    const p = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) positions.push(p.getX(i), p.getY(i), p.getZ(i))
    const idx = g.index
    if (idx) for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset)
    else for (let i = 0; i < p.count; i++) indices.push(i + offset)
    offset += p.count
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  return g
}
