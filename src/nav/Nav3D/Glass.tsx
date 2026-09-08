import { MeshTransmissionMaterial } from '@react-three/drei'
import { useGlassProps } from './materials'
import { useTuning } from './tuning'

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
}

/** The one shared glass look (see tuning.ts presets) in its three render forms. */
export function Glass({ solid = false, sampler = false }: GlassProps) {
  const transmissive = useGlassProps()
  const g = useTuning((s) => s.glass)
  if (!solid) return <MeshTransmissionMaterial {...transmissive} transmissionSampler={sampler} />
  return (
    <meshPhysicalMaterial
      color={g.color}
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
