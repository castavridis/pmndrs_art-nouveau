import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { damp, damp3 } from 'maath/easing'
import { Glass } from '../nav/Nav3D/Glass'
import { makeRoundedRectGeometry } from '../nav/Nav3D/roundedRectGeometry'
import { px } from '../nav/tokens'
import type { PresetName } from '../nav/Nav3D/customPresets'
import { Container, Text } from '@react-three/uikit'
import { LAYER, useLayer } from '../nav/Nav3D/layers'
import { useContrast } from '../nav/Nav3D/contrast'
import { INKS } from '../nav/Nav3D/dom'
import { tokens } from '../nav/tokens'

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
  /** Set by `useHoverPointer`; see its `frozen` option. */
  frozen: boolean
}

export interface HoverPointerOptions {
  /**
   * Elements the pill should retreat from, as a selector. The close button is deliberately not
   * in here: the pill lives under it, so shrinking there would make it vanish on approach.
   */
  retreatFrom?: string
  /** Elements that count as the pill's home rather than a thing to retreat from. */
  homeSelector?: string
  /**
   * Stop taking pointer updates. Set the moment the surface is struck: dismissing it takes its
   * pointer events away, which fires `pointerleave`, and the pill would race home over the few
   * frames before it is told it is falling. A layout effect, so it lands in the same commit.
   */
  frozen?: boolean
}

/**
 * Tracks the pointer over `ref` into a mutable object.
 *
 * Reduced motion keeps `inside` false, so the pill stays parked instead of chasing the cursor.
 */
export function useHoverPointer(
  ref: RefObject<HTMLElement | null>,
  { retreatFrom = 'a, button', homeSelector = '[data-pill-home]', frozen = false }: HoverPointerOptions = {},
): RefObject<HoverState> {
  const hover = useRef<HoverState>({ x: 0, y: 0, inside: false, onLink: false, frozen: false })
  useLayoutEffect(() => {
    hover.current.frozen = frozen
  }, [frozen])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const move = (e: PointerEvent) => {
      if (hover.current.frozen) return
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
      if (hover.current.frozen) return
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
  /** Which glass the chip wears (materials.dismiss); the live tuning when omitted. */
  preset?: PresetName
  /** A mark set on the chip's face, in uikit's text renderer — the nav's, so it stays crisp. */
  label?: string
  /** The mark's colour until the chip has been measured. */
  labelColor?: string
  /** Degrees to turn the mark by. A cross is a plus at 45°; see the note at the call site. */
  labelRotate?: number
  /** Struck: the chip stops following and drops away from wherever it was standing. */
  falling?: boolean
}

/**
 * A small glass chip that parks at `home` and follows the pointer across the surface, the way
 * the nav's chip travels between items. Over a link it shrinks away rather than sitting under
 * the words, and swells back where the pointer left off.
 *
 * Struck, it stops following and drops away from wherever it was standing, with the same gravity
 * the shards fall under. Its mark is set on the face in uikit's text renderer — the nav's, so it
 * stays crisp at any size — and rides along as a child of the chip.
 *
 * Half in, half out of the surface's face, like the nav's chip. It writes no depth, so the copy
 * printed on that face still draws over it and the chip glides behind the words rather than
 * across them; anything genuinely in front, like a flourish, still covers it in the normal way.
 *
 * Scale carries the appearing and disappearing because the glass is opaque: a transmission
 * material has no opacity to animate without dropping out of the transmission pass entirely.
 */
/** World units per second squared, matching the shards the banner breaks into. */
const GRAVITY = -9

export function HoverPill({
  hover,
  home,
  size,
  depth = 5,
  surfaceDepth,
  preset,
  label,
  labelColor = '#1a1c10',
  labelRotate = 0,
  falling = false,
}: HoverPillProps) {
  const group = useRef<THREE.Group>(null!)
  const geometry = useMemo(
    () => makeRoundedRectGeometry(size, size, size / 2, depth),
    [size, depth],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  const overrides = useMemo(() => ({ depthWrite: false }), [])

  // The mark rides the chip as a child, so it travels, scales and tumbles with it. It must stay
  // out of the glass's transmission buffer or the chip would refract its own face.
  const ui = useRef<THREE.Group>(null)
  useLayer(ui, LAYER.TEXT, { live: true })
  // The mark takes the ink measured on the chip's own face (contrast.ts): the chip is glass, and
  // what it shows depends on the banner and the page behind it, not on its preset.
  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.size)
  const at = useMemo(() => new THREE.Vector3(), [])
  const face = useCallback(() => {
    const g = group.current
    if (!g || !g.visible) return null
    g.getWorldPosition(at).project(camera)
    // The middle half, where the mark is drawn.
    const s = size * g.scale.x * 0.5
    const cx = ((at.x + 1) / 2) * canvas.width
    const cy = ((1 - at.y) / 2) * canvas.height
    return { x: cx - s / 2, y: cy - s / 2, w: s, h: s }
  }, [at, camera, canvas.width, canvas.height, size])
  const reading = useContrast(face, { name: 'dismiss', enabled: !!label })
  const markColor = reading ? INKS[reading.scheme].ink : labelColor
  const target = useMemo(() => new THREE.Vector3(), [])
  const shown = useRef({ v: 0 })
  const drop = useRef({ vy: 0, vx: 0, spin: 0 })

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const h = hover?.current
    const step = Math.min(dt, 0.05)
    // Struck: it lets go from wherever it was standing rather than snapping home first.
    if (falling) {
      const d = drop.current
      if (d.vy === 0) {
        // A small kick and tumble on release, seeded from where it happened to be.
        d.vy = 0.6
        d.vx = (g.position.x > 0 ? 1 : -1) * 0.35
        d.spin = g.position.x > 0 ? -2.2 : 2.2
      }
      d.vy += GRAVITY * step
      g.position.y += d.vy * step
      g.position.x += d.vx * step
      g.rotation.z += d.spin * step
      return
    }
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
        <Glass sampler preset={preset} overrides={overrides} />
      </mesh>
      {label && (
        <group ref={ui} position-z={px(depth) / 2 + 0.004}>
          <Container
            pixelSize={1 / tokens.pxPerUnit}
            anchorX="center"
            anchorY="center"
            width={size}
            height={size}
            alignItems="center"
            justifyContent="center"
            depthTest={false}
          >
            <Text fontSize={size * 0.62} color={markColor} transformRotateZ={labelRotate}>
              {label}
            </Text>
          </Container>
        </group>
      )}
    </group>
  )
}
