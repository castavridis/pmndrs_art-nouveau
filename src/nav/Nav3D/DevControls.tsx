import { useEffect } from 'react'
import { useControls, folder, Leva } from 'leva'
import { useTuning, defaultTuning, glassPresets, type GlassPreset, type RectLightTuning, type Vec3 } from './tuning'

// leva vector controls use tuples; the store uses {x,y,z}.
type V = [number, number, number]
const toV = (v: Vec3): V => [v.x, v.y, v.z]
const fromV = ([x, y, z]: V): Vec3 => ({ x, y, z })

/** leva panel. Only ever imported in dev — see index.tsx. */
export default function DevControls() {
  const set = useTuning((s) => s.set)
  const applyPreset = useTuning((s) => s.applyPreset)
  const g = defaultTuning.glass
  const { preset } = useControls({ preset: { value: 'roughGlass' as GlassPreset, options: Object.keys(glassPresets) as GlassPreset[] } })
  const glass = useControls('glass', {
    look: folder({
      color: g.color,
      metalness: { value: g.metalness, min: 0, max: 1 },
      transmission: { value: g.transmission, min: 0, max: 1 },
      thickness: { value: g.thickness, min: 0, max: 2 },
      roughness: { value: g.roughness, min: 0, max: 1 },
      ior: { value: g.ior, min: 1, max: 2.333 },
      clearcoat: { value: g.clearcoat, min: 0, max: 1 },
      clearcoatRoughness: { value: g.clearcoatRoughness, min: 0, max: 1 },
      envMapIntensity: { value: g.envMapIntensity, min: 0, max: 4 },
      opacity: { value: g.opacity, min: 0, max: 1 },
    }),
    specular: folder({
      specularColor: g.specularColor,
      specularIntensity: { value: g.specularIntensity, min: 0, max: 1 },
      sheen: { value: g.sheen, min: 0, max: 1 },
      sheenRoughness: { value: g.sheenRoughness, min: 0, max: 1 },
      sheenColor: g.sheenColor,
    }),
    iridescence: folder({
      iridescence: { value: g.iridescence, min: 0, max: 1 },
      iridescenceIOR: { value: g.iridescenceIOR, min: 1, max: 2.333 },
      iridescenceThicknessMin: { value: g.iridescenceThicknessMin, min: 0, max: 1000 },
      iridescenceThicknessMax: { value: g.iridescenceThicknessMax, min: 0, max: 1000 },
    }),
    refraction: folder({
      chromaticAberration: { value: g.chromaticAberration, min: 0, max: 1 },
      anisotropicBlur: { value: g.anisotropicBlur, min: 0, max: 1 },
      distortion: { value: g.distortion, min: 0, max: 1 },
      distortionScale: { value: g.distortionScale, min: 0, max: 1 },
      temporalDistortion: { value: g.temporalDistortion, min: 0, max: 1 },
      attenuationColor: g.attenuationColor,
      attenuationDistance: { value: g.attenuationDistance, min: 0, max: 10 },
      background: g.background,
      normalScale: { value: g.normalScale, min: 0, max: 2 },
      normalRepeat: { value: g.normalRepeat, min: 0.25, max: 8 },
    }),
    quality: folder({
      samples: { value: g.samples, min: 1, max: 8, step: 1 },
      resolution: { value: g.resolution, options: [256, 512, 1024] },
    }),
  })
  const env = useControls('environment', {
    intensity: { value: defaultTuning.env.intensity, min: 0, max: 4 },
    rotation: { value: defaultTuning.env.rotation, min: -Math.PI, max: Math.PI },
  })
  const post = useControls('post', {
    bloomIntensity: { value: defaultTuning.post.bloomIntensity, min: 0, max: 2 },
    bloomThreshold: { value: defaultTuning.post.bloomThreshold, min: 0, max: 1 },
    bloomSmoothing: { value: defaultTuning.post.bloomSmoothing, min: 0, max: 1 },
    aberration: { value: defaultTuning.post.aberration, min: 0, max: 0.01, step: 0.0001 },
  })

  const L = defaultTuning.lights
  const { debug, luminanceScale, emitters, emitterScale } = useControls('lights', {
    debug: L.debug,
    luminanceScale: { value: L.luminanceScale, min: 0, max: 2 },
    emitters: L.emitters,
    emitterScale: { value: L.emitterScale, min: 0, max: 1 },
  })
  const oh = useControls('lights.overhead', {
    color: L.overhead.color,
    intensity: { value: L.overhead.intensity, min: 0, max: 400 },
    position: { value: toV(L.overhead.position), step: 1 },
    target: { value: toV(L.overhead.target), step: 1 },
    angle: { value: L.overhead.angle, min: 1, max: 90 },
    penumbra: { value: L.overhead.penumbra, min: 0, max: 1 },
  })
  const rect0 = useRectControls(L.rects[0]!)
  const rect1 = useRectControls(L.rects[1]!)
  const rect2 = useRectControls(L.rects[2]!)
  const rect3 = useRectControls(L.rects[3]!)
  useEffect(() => {
    set('lights', {
      debug,
      luminanceScale,
      emitters,
      emitterScale,
      overhead: {
        color: oh.color,
        intensity: oh.intensity,
        position: fromV(oh.position),
        target: fromV(oh.target),
        angle: oh.angle,
        penumbra: oh.penumbra,
      },
      rects: [rect0, rect1, rect2, rect3],
    })
  }, [debug, luminanceScale, emitters, emitterScale, oh, rect0, rect1, rect2, rect3, set])

  useEffect(() => set('glass', glass), [glass, set])
  // Preset select overrides the sliders (leva keeps its own values; pick a preset to reset the look).
  useEffect(() => applyPreset(preset), [preset, applyPreset])
  useEffect(() => set('env', env), [env, set])
  useEffect(() => set('post', post), [post, set])

  return <Leva collapsed titleBar={{ title: 'nav 3D' }} />
}

/** One leva folder per rect light, in Womp units: area (in), colour, luminance, rotation (deg), position (in). */
function useRectControls(d: RectLightTuning): RectLightTuning {
  const c = useControls(`lights.rect: ${d.name}`, {
    color: d.color,
    luminance: { value: d.luminance, min: 0, max: 100 },
    width: { value: d.width, min: 0.5, max: 2000, step: 0.5 },
    height: { value: d.height, min: 0.5, max: 2000, step: 0.5 },
    position: { value: toV(d.position), step: 1 },
    rotation: { value: toV(d.rotation), step: 5 },
  })
  return { name: d.name, ...c, position: fromV(c.position), rotation: fromV(c.rotation) }
}
