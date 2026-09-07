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
      roughness={g.roughness * 2}
      metalness={0}
      ior={g.ior}
      iridescence={g.iridescence}
      iridescenceIOR={g.iridescenceIOR}
      iridescenceThicknessRange={[g.iridescenceThicknessMin, g.iridescenceThicknessMax]}
      clearcoat={g.clearcoat}
      clearcoatRoughness={g.clearcoatRoughness}
      envMapIntensity={g.envMapIntensity}
      sheen={0.4}
      sheenColor="#ffffff"
      sheenRoughness={0.6}
    />
  )
}
