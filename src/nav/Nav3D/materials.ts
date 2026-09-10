import { useMemo } from 'react'
import * as THREE from 'three'
import type { MeshTransmissionMaterialProps } from '@react-three/drei/core/MeshTransmissionMaterial'
import { useTuning, type Tuning } from './tuning'
import { makeSheenNoiseMap, makeSurfaceNormalMap } from './surfaceNormals'
import { BUFFER_MASK } from './layers'

/**
 * three@0.182's sheen BRDF divides by zero at grazing angles under punctual lights
 * (V_Neubelt when dotNL and dotNV are both 0, D_Charlie when the roughness underflows).
 * One NaN pixel is invisible on its own, but the bloom pass blurs it across the whole frame
 * and every canvas turns black as soon as a point or spot light is added. Clamp the
 * denominators before any material compiles.
 */
const sheenChunk = THREE.ShaderChunk.lights_physical_pars_fragment
THREE.ShaderChunk.lights_physical_pars_fragment = sheenChunk
  .replace('float invAlpha = 1.0 / alpha;', 'float invAlpha = 1.0 / max( alpha, 1e-6 );')
  .replace(
    'return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );',
    'return saturate( 1.0 / ( 4.0 * max( dotNL + dotNV - dotNL * dotNV, 1e-4 ) ) );',
  )

let surfaceNormals: THREE.DataTexture | undefined
const getSurfaceNormals = () => (surfaceNormals ??= makeSurfaceNormalMap())

/**
 * Noise textures by strength (quantised so tuning does not allocate per frame). RGB carries
 * 1 - strength*noise (used for sheen colour and roughness), alpha carries sheen roughness.
 */
const sheenNoise = new Map<number, THREE.DataTexture>()
export function getSheenNoise(strength: number, scale: number): THREE.DataTexture | null {
  // Guard against tunings saved before these fields existed: a NaN repeat renders black.
  if (!Number.isFinite(strength) || strength <= 0) return null
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1
  const key = Math.round(Math.min(strength, 1) * 20) / 20
  let tex = sheenNoise.get(key)
  if (!tex) sheenNoise.set(key, (tex = makeSheenNoiseMap(key)))
  tex.repeat.set(s, s)
  return tex
}

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
    sheenColorMap: getSheenNoise(g.sheenNoise, g.sheenNoiseScale),
    sheenRoughnessMap: getSheenNoise(g.sheenNoise, g.sheenNoiseScale),
    // roughnessMap reads the green channel; the noise texture is grey so any channel works.
    roughnessMap: getSheenNoise(g.roughnessNoise, g.sheenNoiseScale),
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
  return useGlassPropsFor(g)
}

/** Same, for a specific look (e.g. a palette preset) instead of the live-tuned one. */
export function useGlassPropsFor(g: Tuning['glass']): MeshTransmissionMaterialProps {
  const background = useMemo(() => new THREE.Color(g.background), [g.background])
  const normalScale = useMemo(() => new THREE.Vector2(g.normalScale, g.normalScale), [g.normalScale])
  return useMemo(() => glassProps(g, background, getSurfaceNormals(), normalScale), [g, background, normalScale])
}

interface SceneHook {
  hosts: Map<THREE.Mesh, THREE.Material>
  restore: () => void
}
const sceneHooks = new Map<THREE.Scene, SceneHook>()

/**
 * Register a mesh whose buffered MeshTransmissionMaterial renders the scene into its own
 * buffer. That buffer must not refract the text sitting on the glass, and must show the light
 * emitters that the viewer never sees directly (see layers.ts).
 *
 * drei@10.7 renders the buffer with the viewer's own camera, swapping the host's material for a
 * DiscardMaterial for the duration; the scene's onBeforeRender runs before three builds its draw
 * lists, so switching the camera's layer mask there changes what that one pass draws, and
 * onAfterRender puts it back. One hook per scene, installed with the first host and removed with
 * the last, so the emitters show through every buffered glass (the pill, the cube, a callout).
 *
 * This replaced walking every excluded object and flipping its `visible` flag before and after
 * the pass. uikit re-asserts its own meshes' flags during the render, so that fought uikit, and
 * any other code hiding an object for its own reasons had its choice undone after each frame.
 */
export function registerTransmissionHost(scene: THREE.Scene, host: THREE.Mesh, glass: THREE.Material): () => void {
  let hook = sceneHooks.get(scene)
  if (!hook) {
    const hosts = new Map<THREE.Mesh, THREE.Material>()
    const prevBefore = scene.onBeforeRender
    const prevAfter = scene.onAfterRender
    // The mask a camera had before a buffer pass took it over.
    const held = new Map<THREE.Camera, number>()
    scene.onBeforeRender = function (renderer, sc, camera, ...rest) {
      let inBufferPass = false
      for (const [m, g] of hosts) if (m.material !== g) inBufferPass = true
      if (inBufferPass && !held.has(camera)) {
        held.set(camera, camera.layers.mask)
        camera.layers.mask = BUFFER_MASK
      }
      prevBefore.call(this, renderer, sc, camera, ...rest)
    }
    scene.onAfterRender = function (renderer, sc, camera, ...rest) {
      const mask = held.get(camera)
      if (mask !== undefined) {
        camera.layers.mask = mask
        held.delete(camera)
      }
      prevAfter.call(this, renderer, sc, camera, ...rest)
    }
    hook = {
      hosts,
      restore: () => {
        scene.onBeforeRender = prevBefore
        scene.onAfterRender = prevAfter
        for (const [camera, mask] of held) camera.layers.mask = mask
        held.clear()
      },
    }
    sceneHooks.set(scene, hook)
  }
  hook.hosts.set(host, glass)
  return () => {
    const h = sceneHooks.get(scene)
    if (!h) return
    h.hosts.delete(host)
    if (h.hosts.size === 0) {
      h.restore()
      sceneHooks.delete(scene)
    }
  }
}
