import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { getSheenNoise, registerTransmissionHost, useGlassPropsFor } from './materials'
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
    () =>
      '#' + new THREE.Color(g.color).lerp(new THREE.Color(g.attenuationColor), 0.65).getHexString(),
    [g.color, g.attenuationColor],
  )
  // Adding or removing a map changes the shader's defines; three only recompiles on
  // needsUpdate, which a prop spread does not set. Remount the material when that flips.
  const mapKey = `${g.sheenNoise > 0 ? 's' : ''}${g.roughnessNoise > 0 ? 'r' : ''}${g.normalScale > 0 ? 'n' : ''}`
  if (!solid) return <Buffered key={mapKey} sampler={sampler} props={transmissive} />
  return (
    <meshPhysicalMaterial
      key={mapKey}
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
      sheenColorMap={getSheenNoise(g.sheenNoise, g.sheenNoiseScale)}
      sheenRoughnessMap={getSheenNoise(g.sheenNoise, g.sheenNoiseScale)}
      roughnessMap={getSheenNoise(g.roughnessNoise, g.sheenNoiseScale)}
    />
  )
}

/**
 * The transmission material. In buffered form (no sampler) the host mesh is registered so
 * the light emitters show through it and the text layer stays out of its buffer.
 */
function Buffered({ sampler, props }: { sampler: boolean; props: ReturnType<typeof useGlassPropsFor> }) {
  const ref = useRef<THREE.Material | null>(null)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const m = ref.current as (THREE.Material & { __r3f?: { parent?: { object?: THREE.Object3D } } }) | null
    if (sampler || !m) return
    // R3F attaches the material to its parent mesh; the instance record points back at it.
    const host = m.__r3f?.parent?.object
    if (!(host instanceof THREE.Mesh)) return
    return registerTransmissionHost(scene, host, m)
  }, [sampler, scene, props])
  return (
    <MeshTransmissionMaterial
      ref={(m) => void (ref.current = (m as THREE.Material | null) ?? null)}
      {...props}
      transmissionSampler={sampler}
    />
  )
}
