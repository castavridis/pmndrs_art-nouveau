import { useMemo } from 'react'
import * as THREE from 'three'
import type { MeshTransmissionMaterialProps } from '@react-three/drei/core/MeshTransmissionMaterial'
import { useTuning, type Tuning } from './tuning'
import { makeSurfaceNormalMap } from './surfaceNormals'

let surfaceNormals: THREE.DataTexture | undefined
const getSurfaceNormals = () => (surfaceNormals ??= makeSurfaceNormalMap())

/**
 * The single glass look shared by the pill, clusters and petals. Consumers spread
 * `useGlassProps()` onto a drei <MeshTransmissionMaterial>.
 *
 * drei@10.7: MeshTransmissionMaterial renders its own transmission buffer per instance.
 * Pass `transmissionSampler` for secondary meshes (clusters, petals) so they reuse
 * three's built-in transmission pass instead of adding a full-scene render each.
 */
export function glassProps(
  g: Tuning['glass'],
  background: THREE.Color,
  normalMap: THREE.Texture,
  normalScale: THREE.Vector2,
): MeshTransmissionMaterialProps {
  normalMap.repeat.set(g.normalRepeat, g.normalRepeat)
  return {
    background,
    normalMap,
    normalScale,
    color: g.color,
    metalness: g.metalness,
    roughness: g.roughness,
    transmission: g.transmission,
    thickness: g.thickness,
    ior: g.ior,
    specularColor: g.specularColor,
    specularIntensity: g.specularIntensity,
    sheen: g.sheen,
    sheenRoughness: g.sheenRoughness,
    sheenColor: g.sheenColor,
    opacity: g.opacity,
    transparent: g.opacity < 1,
    chromaticAberration: g.chromaticAberration,
    anisotropicBlur: g.anisotropicBlur,
    distortion: g.distortion,
    distortionScale: g.distortionScale,
    temporalDistortion: g.temporalDistortion,
    iridescence: g.iridescence,
    iridescenceIOR: g.iridescenceIOR,
    iridescenceThicknessRange: [g.iridescenceThicknessMin, g.iridescenceThicknessMax],
    clearcoat: g.clearcoat,
    clearcoatRoughness: g.clearcoatRoughness,
    envMapIntensity: g.envMapIntensity,
    attenuationColor: g.attenuationColor,
    attenuationDistance: g.attenuationDistance,
    samples: Math.min(g.samples, 8),
    resolution: g.resolution,
    toneMapped: true,
  }
}

export function useGlassProps(): MeshTransmissionMaterialProps {
  const g = useTuning((s) => s.glass)
  const background = useMemo(() => new THREE.Color(g.background), [g.background])
  const normalScale = useMemo(() => new THREE.Vector2(g.normalScale, g.normalScale), [g.normalScale])
  return useMemo(() => glassProps(g, background, getSurfaceNormals(), normalScale), [g, background, normalScale])
}

/**
 * Objects that must not appear inside the pill's transmission buffer (e.g. the text layer
 * sitting on the glass, which would otherwise show up as a refracted ghost).
 * drei@10.7 MeshTransmissionMaterial swaps its mesh's material for a DiscardMaterial while
 * rendering the buffer; `installTransmissionExclusion` uses that as the signal.
 */
export const transmissionExcluded = new Set<THREE.Object3D>()
/**
 * Objects visible ONLY inside the pill's transmission buffer: light emitters that, as in the
 * DCC, must not be seen by the camera directly but should show through the glass.
 */
export const transmissionOnly = new Set<THREE.Object3D>()

export function installTransmissionExclusion(scene: THREE.Scene, host: THREE.Mesh, glass: THREE.Material) {
  const prevBefore = scene.onBeforeRender
  const prevAfter = scene.onAfterRender
  scene.onBeforeRender = function (...args) {
    const inBufferPass = host.material !== glass
    for (const o of transmissionExcluded) o.visible = !inBufferPass
    for (const o of transmissionOnly) o.visible = inBufferPass
    prevBefore.apply(this, args)
  }
  scene.onAfterRender = function (...args) {
    for (const o of transmissionExcluded) o.visible = true
    for (const o of transmissionOnly) o.visible = false
    prevAfter.apply(this, args)
  }
  return () => {
    scene.onBeforeRender = prevBefore
    scene.onAfterRender = prevAfter
    for (const o of transmissionExcluded) o.visible = true
    for (const o of transmissionOnly) o.visible = false
  }
}
