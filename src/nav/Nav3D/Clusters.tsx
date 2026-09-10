import { animated, type SpringValue } from '@react-spring/three'
import { px, tokens } from '../tokens'
import { Glass } from './Glass'
import { hoverAimHandlers } from './aim'
import { useTuning } from './tuning'
import { useNavAssets } from './assets'

export interface ClustersProps {
  /** Pill width in CSS px (spring). */
  width: SpringValue<number>
}

/**
 * Flower clusters from left.glb / right.glb, pinned to the centre of each pill cap.
 * Position-only: they never scale with width. Geometry origins are normalised to the cap
 * centres in assets.ts, so the only maths here is "where is the cap" — and the frame's scale
 * (tokens.frameScale) grows each one about its cap centre.
 */
export function Clusters({ width }: ClustersProps) {
  const choice = useTuning((s) => s.materials.clusters)
  const preset = choice === 'live' ? undefined : choice
  const { left, right } = useNavAssets()
  const cap = px(tokens.pillRadius)
  const leftX = width.to((w) => -(px(w) / 2 - cap))
  const rightX = width.to((w) => px(w) / 2 - cap)
  return (
    <>
      <animated.group position-x={leftX}>
        <mesh geometry={left} name="cluster left" scale={tokens.frameScale} {...hoverAimHandlers}>
          <Glass sampler preset={preset} />
        </mesh>
      </animated.group>
      <animated.group position-x={rightX}>
        <mesh geometry={right} name="cluster right" scale={tokens.frameScale} {...hoverAimHandlers}>
          <Glass sampler preset={preset} />
        </mesh>
      </animated.group>
    </>
  )
}
