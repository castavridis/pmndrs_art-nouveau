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
 * The pointer's hit point on a petal or flower (world units), with the scene it is in, so that
 * scene's roaming light can sit on the hovered piece. `active` clears on pointer-out.
 *
 * The scene, not the canvas the event arrived at: a page-wide canvas (the bento) takes its
 * events from the page over it, so the event's target is whatever element the pointer is over,
 * never the canvas, and a light matching on the canvas never found its own petals hovered.
 */
export const hoverAim = {
  point: new THREE.Vector3(),
  active: false,
  scene: null as THREE.Object3D | null,
  /** The hovered mesh and instance: captured by the light, and left alone by the pointer stir. */
  mesh: null as THREE.Object3D | null,
  instanceId: null as number | null,
}

/** Pointer handlers for meshes the roaming light should settle on when hovered. */
export const hoverAimHandlers = {
  onPointerMove: (e: ThreeEvent<PointerEvent>) => {
    hoverAim.point.copy(e.point)
    hoverAim.active = true
    let root: THREE.Object3D = e.object
    while (root.parent) root = root.parent
    hoverAim.scene = root
    hoverAim.mesh = e.object
    hoverAim.instanceId = e.instanceId ?? null
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
    hoverAim.mesh = null
    hoverAim.instanceId = null
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

import { useEffect } from 'react'
import { px } from '../tokens'

/** Last pointer position over the page (client px), shared by every canvas; null when it left. */
export const pagePointer: { current: { x: number; y: number } | null } = { current: null }
let pointerListeners = 0
let pointerOff: (() => void) | null = null
export function usePagePointer() {
  useEffect(() => {
    if (pointerListeners++ === 0) {
      const move = (e: PointerEvent) => (pagePointer.current = { x: e.clientX, y: e.clientY })
      const leave = () => (pagePointer.current = null)
      window.addEventListener('pointermove', move, { passive: true })
      document.documentElement.addEventListener('pointerleave', leave)
      window.addEventListener('blur', leave)
      pointerOff = () => {
        window.removeEventListener('pointermove', move)
        document.documentElement.removeEventListener('pointerleave', leave)
        window.removeEventListener('blur', leave)
      }
    }
    return () => {
      if (--pointerListeners === 0) pointerOff?.()
    }
  }, [])
}

/**
 * The page pointer in a canvas's world x/y at z = 0 (1 unit = pxPerUnit px, origin at the
 * canvas centre). False when the pointer is off the page.
 *
 * `into` carries it into that object's own space. What the pointer stirs lives in its parent's
 * frame, and a nav riding a slot in a page-wide canvas (the bento) sits well away from the
 * canvas centre, so a stir left in world space pushed petals a slot's width from the pointer.
 */
export function pointerWorldXY(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  out: THREE.Vector3,
  into?: THREE.Object3D,
): boolean {
  const p = pagePointer.current
  if (!p) return false
  const rect = canvas.getBoundingClientRect()
  out.set(px(p.x - rect.left) - px(width) / 2, px(height) / 2 - px(p.y - rect.top), 0)
  if (into) {
    into.updateWorldMatrix(true, false)
    into.worldToLocal(out)
  }
  return true
}

/** Index of the instance the pointer holds on `mesh`, or -1: the stir must not move it. */
export function capturedInstance(mesh: THREE.Object3D): number {
  return hoverAim.active && hoverAim.mesh === mesh && hoverAim.instanceId !== null ? hoverAim.instanceId : -1
}
