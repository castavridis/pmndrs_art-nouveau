import { useRef } from 'react'
import type * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { damp } from 'maath/easing'
import { useNavStore } from '../store'
import { px, tokens } from '../tokens'
import { useNavAssets } from './assets'
import { Glass } from './Glass'
import { useTuning } from './tuning'
import { useItemRegistry } from './items'

const GAP_PX = 10

/**
 * One petal, in its own green glass, centred below the current page's item. Follows the
 * item's uikit element every frame (so it rides layout changes and the width spring) with a
 * critically damped ease; scales to zero when there is no current page.
 */
export function Indicator() {
  const { petal } = useNavAssets()
  const preset = useTuning((s) => s.materials.indicator)
  const registry = useItemRegistry()
  const active = useNavStore((s) => s.active)
  const reducedMotion = useNavStore((s) => s.reducedMotion)
  const group = useRef<THREE.Group>(null!)
  const hasTarget = useRef(false)

  useFrame((_, dt) => {
    const g = group.current
    const el = active ? registry?.get(active) : undefined
    // uikit@1.0: `relativeCenter` is the element's centre in px relative to its parent (the
    // root row, which sits at the nav origin), so it converts straight to world x.
    const rc = el?.relativeCenter.peek()
    if (el && rc) {
      const x = px(rc[0])
      const y = -px(tokens.pillHeight / 2 + GAP_PX)
      if (!hasTarget.current || reducedMotion) {
        g.position.set(x, y, g.position.z)
        hasTarget.current = true
      } else {
        damp(g.position, 'x', x, 0.18, dt)
      }
      damp(g.scale, 'x', 1, 0.2, dt)
      damp(g.scale, 'y', 1, 0.2, dt)
      damp(g.scale, 'z', 1, 0.2, dt)
    } else {
      hasTarget.current = false
      damp(g.scale, 'x', 0.0001, 0.2, dt)
      damp(g.scale, 'y', 0.0001, 0.2, dt)
      damp(g.scale, 'z', 0.0001, 0.2, dt)
    }
  })

  return (
    <group ref={group} position={[0, 0, px(tokens.pillDepth / 2 + 4)]} scale={0.0001}>
      {/* Petal tip pointing up at the item. */}
      <mesh geometry={petal} rotation={[0.2, 0, Math.PI / 2]} raycast={() => null}>
        <Glass preset={preset} sampler />
      </mesh>
    </group>
  )
}
