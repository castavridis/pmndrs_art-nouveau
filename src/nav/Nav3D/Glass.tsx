import { useMemo } from 'react'
import * as THREE from 'three'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { useGlassPropsFor } from './materials'
import { glassPresets, useTuning, type GlassPreset } from './tuning'

export interface GlassProps {
  /**
   * `solid`: the same look without transmission (cheapest; no refraction).
   * Default: full transmission with drei's per-material buffer (the pill).
   */
  solid?: boolean
  /**
   * `sampler`: full transmission through three's built-in, scene-wide transmission pass, which
   * is rendered once per frame and shared by every mesh using it. Used for clusters, petals
   * and the logo so applying the material everywhere costs one extra pass, not one per mesh.
   * (drei@10: `transmissionSampler`; the `background` colour trick only applies to the buffer path.)
   */
  sampler?: boolean
  /** Use a fixed preset (palette tint, indicator) instead of the live-tuned look. */
  preset?: GlassPreset
}

/** The one shared glass look (see tuning.ts presets) in its three render forms. */
export function Glass({ solid = false, sampler = false, preset }: GlassProps) {
  const live = useTuning((s) => s.glass)
  const g = preset ? glassPresets[preset] : live
  const transmissive = useGlassPropsFor(g)
  // Without transmission there is no volume for the subsurface tint to act in, so the solid
  // form blends it into the base colour instead (this is what makes palette petals coloured).
  const solidColor = useMemo(
    () => '#' + new THREE.Color(g.color).lerp(new THREE.Color(g.attenuationColor), 0.65).getHexString(),
    [g.color, g.attenuationColor],
  )
  if (!solid) return <MeshTransmissionMaterial {...transmissive} transmissionSampler={sampler} />
  return (
    <meshPhysicalMaterial
      color={solidColor}
      roughness={Math.min(g.roughness * 2, 1)}
      metalness={g.metalness}
      ior={g.ior}
      specularColor={g.specularColor}
      specularIntensity={g.specularIntensity}
      iridescence={g.iridescence}
      iridescenceIOR={g.iridescenceIOR}
      iridescenceThicknessRange={[g.iridescenceThicknessMin, g.iridescenceThicknessMax]}
      clearcoat={g.clearcoat}
      clearcoatRoughness={g.clearcoatRoughness}
      envMapIntensity={g.envMapIntensity}
      sheen={Math.max(g.sheen, 0.4)}
      sheenColor={g.sheenColor}
      sheenRoughness={Math.max(g.sheenRoughness, 0.6)}
    />
  )
}
