/**
 * Where the current page's item sits (world x, canvas-centred), written each frame by the
 * nav (AimTracker in NavRoot) and read by lights that should point at it. Module-level so
 * the light, which lives outside the nav's item registry, can follow without a re-render.
 */
export const navAim = { x: 0, active: false }

import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { create } from 'zustand'

export interface HitInfo {
  /** Mesh name (see the petal/flower meshes) or three type when unnamed. */
  name: string
  instanceId: number | null
  distance: number
  point: [number, number, number]
}

interface HitDebugStore {
  enabled: boolean
  /** Every petal/flower under the pointer, nearest first; cleared on pointer-out. */
  hits: HitInfo[]
  x: number
  y: number
  setEnabled: (v: boolean) => void
  report: (hits: HitInfo[], x: number, y: number) => void
}

/** Dev: which petal/flower meshes the pointer is over (view → hit debug). */
export const useHitDebug = create<HitDebugStore>()((set) => ({
  enabled: false,
  hits: [],
  x: 0,
  y: 0,
  setEnabled: (enabled) => set({ enabled, hits: [] }),
  report: (hits, x, y) => set({ hits, x, y }),
}))

/**
 * The pointer's hit point on a petal or flower (world units), with the canvas it came from,
 * so that canvas's roaming light can sit on the hovered piece. `active` clears on pointer-out.
 */
export const hoverAim = { point: new THREE.Vector3(), active: false, canvas: null as EventTarget | null }

/** Pointer handlers for meshes the roaming light should settle on when hovered. */
export const hoverAimHandlers = {
  onPointerMove: (e: ThreeEvent<PointerEvent>) => {
    hoverAim.point.copy(e.point)
    hoverAim.active = true
    hoverAim.canvas = e.nativeEvent.target
    if (useHitDebug.getState().enabled) {
      // All petal/flower intersections under the pointer (R3F lists every handled object hit).
      const hits: HitInfo[] = e.intersections
        .filter((i) => i.object.name.startsWith('petal') || i.object.name.startsWith('flower') || i.object.name.startsWith('cluster'))
        .map((i) => ({
          name: i.object.name || i.object.type,
          instanceId: i.instanceId ?? null,
          distance: +i.distance.toFixed(2),
          point: [+i.point.x.toFixed(2), +i.point.y.toFixed(2), +i.point.z.toFixed(2)],
        }))
      useHitDebug.getState().report(hits, e.nativeEvent.clientX, e.nativeEvent.clientY)
    }
  },
  onPointerOut: () => {
    hoverAim.active = false
    if (useHitDebug.getState().enabled) useHitDebug.getState().report([], useHitDebug.getState().x, useHitDebug.getState().y)
  },
}

declare global {
  interface Window {
    /** Dev-only handle for headless scripts. */
    __hitDebug?: typeof useHitDebug
  }
}
if (import.meta.env.DEV && typeof window !== 'undefined') window.__hitDebug = useHitDebug
