import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { damp, damp3 } from 'maath/easing'
import { Glass } from '../nav/Nav3D/Glass'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { px } from '../nav/tokens'
import { useTuning } from '../nav/Nav3D/tuning'

/**
 * Where the pointer is over a surface, in CSS px from that surface's centre (y up, matching
 * the scene), and what it is over. Mutated in place: the pill reads it every frame, so moving
 * the pointer never re-renders React.
 */
export interface HoverState {
  x: number
  y: number
  /** Pointer is over the surface at all. */
  inside: boolean
  /** Pointer is over something with its own click target, so the pill should get out of the way. */
  onLink: boolean
}

export interface HoverPointerOptions {
  /**
   * Elements the pill should retreat from, as a selector. The close button is deliberately not
   * in here: the pill lives under it, so shrinking there would make it vanish on approach.
   */
  retreatFrom?: string
  /** Elements that count as the pill's home rather than a thing to retreat from. */
  homeSelector?: string
}

/**
 * Tracks the pointer over `ref` into a mutable object.
 *
 * Reduced motion keeps `inside` false, so the pill stays parked instead of chasing the cursor.
 */
export function useHoverPointer(
  ref: RefObject<HTMLElement | null>,
  { retreatFrom = 'a, button', homeSelector = '[data-pill-home]' }: HoverPointerOptions = {},
): RefObject<HoverState> {
  const hover = useRef<HoverState>({ x: 0, y: 0, inside: false, onLink: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const target = e.target as HTMLElement | null
      const home = !!target?.closest(homeSelector)
      hover.current.x = e.clientX - r.left - r.width / 2
      hover.current.y = r.height / 2 - (e.clientY - r.top)
      // Over its home the pill is already where it belongs; leave it parked rather than
      // dragging it a few pixels to meet the cursor.
      hover.current.inside = !home
      hover.current.onLink = !home && !!target?.closest(retreatFrom)
    }
    const leave = () => {
      hover.current.inside = false
      hover.current.onLink = false
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [ref, retreatFrom, homeSelector])
  return hover
}

export interface HoverPillProps {
  hover?: RefObject<HoverState> | null
  /** Rest position in CSS px from the surface's centre, y up. */
  home: [number, number]
  /** Diameter in CSS px. */
  size: number
  depth?: number
  /** Depth of the surface it rides, in CSS px. The chip is centred on that surface's front face. */
  surfaceDepth: number
}

/**
 * A small glass chip that parks at `home` and follows the pointer across the surface, the way
 * the nav's chip travels between items. Over a link it shrinks away rather than sitting under
 * the words, and swells back where the pointer left off.
 *
 * Half in, half out of the surface's face, like the nav's chip. It writes no depth, so the copy
 * printed on that face still draws over it and the chip glides behind the words rather than
 * across them; anything genuinely in front, like a flourish, still covers it in the normal way.
 *
 * Scale carries the appearing and disappearing because the glass is opaque: a transmission
 * material has no opacity to animate without dropping out of the transmission pass entirely.
 */
export function HoverPill({ hover, home, size, depth = 5, surfaceDepth }: HoverPillProps) {
  const preset = useTuning((s) => s.materials.selection)
  const group = useRef<THREE.Group>(null!)
  const geometry = useMemo(
    () => makeRoundedRectGeometry(size, size, size / 2, depth),
    [size, depth],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  const target = useMemo(() => new THREE.Vector3(), [])
  const shown = useRef({ v: 0 })

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const h = hover?.current
    const step = Math.min(dt, 0.05)
    target.set(
      px(h?.inside ? h.x : home[0]),
      px(h?.inside ? h.y : home[1]),
      px(surfaceDepth / 2),
    )
    damp3(g.position, target, 0.09, step)
    damp(shown.current, 'v', h?.onLink ? 0 : 1, 0.08, step)
    g.scale.setScalar(Math.max(shown.current.v, 0.0001))
    g.visible = shown.current.v > 0.01
  })

  return (
    <group ref={group} name="hover pill" visible={false}>
      <mesh geometry={geometry} raycast={() => null}>
        <Glass sampler preset={preset} overrides={{ depthWrite: false }} />
      </mesh>
    </group>
  )
}
