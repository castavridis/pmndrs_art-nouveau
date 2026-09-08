import { MeshTransmissionMaterial } from '@react-three/drei'
import { useGlassProps } from './materials'
import { useTuning } from './tuning'

export interface GlassProps {
  /**
   * `solid`: same iridescent thin-film look without transmission. Used for clusters and
   * petals, which read as pearly rather than see-through in the reference and would
   * otherwise each pull in three's full-resolution transmission pass.
   */
  solid?: boolean
}

/** The one shared glass look, in its transmissive (pill) or solid (clusters, petals) form. */
export function Glass({ solid = false }: GlassProps) {
  const transmissive = useGlassProps()
  const g = useTuning((s) => s.glass)
  if (!solid) return <MeshTransmissionMaterial {...transmissive} />
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
