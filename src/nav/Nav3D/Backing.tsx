import { useEffect, useMemo } from 'react'
import { makeRoundedRectGeometry } from './roundedRectGeometry'
import { px } from '../tokens'
import { usePresetGlass } from './paletteTuning'
import { useTuning } from './tuning'
import type { PresetName } from './customPresets'

/**
 * A flat, solid slab in the glass's buffer-background colour, just behind a glass surface
 * that uses three's shared transmission pass. The buffered material clears its own buffer to
 * that colour; the sampler sees the real scene instead, so this backing gives it the same
 * dark ground (and hides what is behind the slab, as the buffer would) at no per-surface cost.
 */
export function Backing({ width, height, depth, preset, radius = 8 }: { width: number; height: number; depth: number; preset?: PresetName; radius?: number }) {
  const live = useTuning((s) => s.glass.background)
  const fromPreset = usePresetGlass(preset ?? 'silverGlass').background
  const color = preset ? fromPreset : live
  const geometry = useMemo(() => makeRoundedRectGeometry(width, height, radius, 1), [width, height, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} position-z={-px(depth / 2) - 0.01} raycast={() => null}>
      <meshBasicMaterial color={color} />
    </mesh>
  )
}
