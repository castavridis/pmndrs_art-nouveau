import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { damp } from 'maath/easing'
import { useNavStore } from '../store'
import { px, tokens } from '../tokens'
import { Glass } from './Glass'
import { makeRoundedRectGeometry } from './roundedRectGeometry'
import { useItemRegistry } from './items'
import { useTuning } from './tuning'

/** Room around the label, and how much shorter than the nav the chip is. */
const PAD_X = 18
const INSET_Y = 10
const DEPTH = 5

/**
 * One small glass chip, raised off the nav's own face, that slides and resizes between items.
 *
 * It is the nav's only highlight: it rides whatever the pointer is over, falls back to the
 * focused item, and settles on the current page when neither applies. That replaces the soft
 * light that used to sit behind each item — a glow reads as an effect applied to the nav, a
 * second piece of glass reads as part of it, and it takes the same tuning as every other
 * surface here. One travelling chip also says what a set of independent lights could not: that
 * these are positions in one row. The current page keeps its own permanent mark in the
 * indicator petal below, so the chip is free to wander.
 *
 * The labels draw with `depthTest` off, so the chip can stand in front of the nav without
 * covering the word it marks. Width is animated rather than the mesh scaled: scaling a rounded
 * rectangle would stretch its caps, and the whole point is that it is the nav's silhouette in
 * miniature.
 */
export function SelectionPill() {
  const registry = useItemRegistry()
  // Pointer first, then keyboard focus, then the page you are on.
  const target = useNavStore((s) => s.hovered ?? s.focused ?? s.active)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  const preset = useTuning((s) => s.materials.selection)
  const mesh = useRef<THREE.Mesh>(null!)
  const group = useRef<THREE.Group>(null!)
  const height = tokens.pillHeight - INSET_Y * 2

  // One geometry, rebuilt only when the width has actually moved a pixel.
  const built = useRef(0)
  const geometry = useMemo(() => makeRoundedRectGeometry(1, height, height / 2, DEPTH), [height])
  useEffect(() => () => geometry.dispose(), [geometry])

  const shown = useRef(0)
  const width = useRef(0)
  const hasTarget = useRef(false)

  useFrame((_, dt) => {
    const g = group.current
    const m = mesh.current
    if (!g || !m) return
    const el = target ? registry?.get(target) : undefined
    const rc = el?.relativeCenter.peek()
    const size = el?.size.peek()
    if (el && rc && size) {
      const x = px(rc[0])
      const target = size[0] + PAD_X * 2
      if (!hasTarget.current || reducedMotion) {
        g.position.x = x
        width.current = target
        hasTarget.current = true
      } else {
        damp(g.position, 'x', x, 0.18, dt)
        damp(width, 'current', target, 0.18, dt)
      }
      if (reducedMotion) shown.current = 1
      else damp(shown, 'current', 1, 0.14, dt)
    } else {
      hasTarget.current = false
      if (reducedMotion) shown.current = 0
      else damp(shown, 'current', 0, 0.14, dt)
    }
    // Below a pixel of difference the rebuild is invisible and the allocation is not.
    if (Math.abs(width.current - built.current) > 1) {
      built.current = width.current
      const next = makeRoundedRectGeometry(Math.max(built.current, 1), height, height / 2, DEPTH)
      m.geometry.dispose()
      m.geometry = next
    }
    // It grows out of the nav's face rather than fading: an opaque material has no opacity to
    // animate, and a chip that swells into place reads as glass being pushed up from below.
    g.scale.setScalar(Math.max(shown.current, 0.0001))
    g.visible = shown.current > 0.01
  })

  return (
    <group ref={group} position-z={px(tokens.pillDepth / 2)} visible={false}>
      <mesh ref={mesh} geometry={geometry} raycast={() => null}>
        <Glass sampler preset={preset} />
      </mesh>
    </group>
  )
}
