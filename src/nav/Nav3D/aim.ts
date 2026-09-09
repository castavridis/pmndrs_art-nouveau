/**
 * Where the current page's item sits (world x, canvas-centred), written each frame by the
 * nav (AimTracker in NavRoot) and read by lights that should point at it. Module-level so
 * the light, which lives outside the nav's item registry, can follow without a re-render.
 */
export const navAim = { x: 0, active: false }

import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'

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
  },
  onPointerOut: () => {
    hoverAim.active = false
  },
}
