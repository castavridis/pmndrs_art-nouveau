import { useEffect, useRef } from 'react'
import { useControls, folder, button, Leva } from 'leva'
import {
  useTuning,
  defaultTuning,
  baseTuning,
  glassPresets,
  matchesPreset,
  pickTuning,
  type GlassPreset,
  type GlassTuning,
  type RectLightTuning,
  type Tuning,
  type Vec3,
} from './tuning'
import { useOutlines } from '../outlines'

// leva vector controls use tuples; the store uses {x,y,z}.
type V = [number, number, number]
const toV = (v: Vec3): V => [v.x, v.y, v.z]
const fromV = ([x, y, z]: V): Vec3 => ({ x, y, z })

/**
 * leva panel. Only ever imported in dev — see index.tsx.
 *
 * Saving / editing:
 *  - every change is written to the tuning store, which persists to localStorage in dev
 *  - "save to project" POSTs the current tuning to the dev server, which writes
 *    src/nav/Nav3D/tuning.saved.json — the values the app then starts from (dev and prod)
 *  - "export" copies JSON to the clipboard, "import" pastes it, "reset" returns to code defaults
 * The panel is initialised from the store (saved JSON + localStorage), not from code defaults.
 */
export default function DevControls() {
  const set = useTuning((s) => s.set)
  const replace = useTuning((s) => s.replace)
  const applyPreset = useTuning((s) => s.applyPreset)
  const g = defaultTuning.glass
  const L = defaultTuning.lights

  // The select shows the preset the store's glass was last set from (kept across reloads),
  // and `status` says whether the values still match it or carry edits.
  // View: traced outlines over the live 3D (all components on the page).
  const overlay = useOutlines((s) => s.overlay)
  const setOverlay = useOutlines((s) => s.setOverlay)
  const [{ outlines }, setViewPanel] = useControls('view', () => ({ outlines: { value: overlay, label: 'svg outlines' } }), { order: -1 })
  useEffect(() => setOverlay(outlines), [outlines, setOverlay])
  useEffect(() => setViewPanel({ outlines: overlay }), [overlay, setViewPanel])

  const [{ preset }, setPresetPanel] = useControls(() => ({
    preset: {
      value: useTuning.getState().preset,
      options: Object.keys(glassPresets) as GlassPreset[],
    },
    status: { value: '', editable: false },
  }))

  const [glass, setGlassPanel] = useControls('glass', () => ({
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
      sheenNoise: { value: g.sheenNoise, min: 0, max: 1 },
      sheenNoiseScale: { value: g.sheenNoiseScale, min: 0.25, max: 16 },
      roughnessNoise: { value: g.roughnessNoise, min: 0, max: 1 },
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
      resolution: { value: g.resolution, options: [256, 512, 768, 1024, 1536, 2048, 4096] },
    }),
  }))

  const [env, setEnvPanel] = useControls('environment', () => ({
    intensity: { value: defaultTuning.env.intensity, min: 0, max: 4 },
    rotation: { value: defaultTuning.env.rotation, min: -Math.PI, max: Math.PI },
    background: defaultTuning.env.background,
    backgroundLight: defaultTuning.env.backgroundLight,
    fog: { value: defaultTuning.env.fog, min: 0, max: 0.3, step: 0.001 },
  }))
  const [post, setPostPanel] = useControls('post', () => ({
    bloomIntensity: { value: defaultTuning.post.bloomIntensity, min: 0, max: 2 },
    bloomThreshold: { value: defaultTuning.post.bloomThreshold, min: 0, max: 1 },
    bloomSmoothing: { value: defaultTuning.post.bloomSmoothing, min: 0, max: 1 },
    bloomRadius: { value: defaultTuning.post.bloomRadius, min: 0, max: 1 },
    aberration: { value: defaultTuning.post.aberration, min: 0, max: 0.01, step: 0.0001 },
  }))

  const [lights, setLightsPanel] = useControls('lights', () => ({
    debug: L.debug,
    luminanceScale: { value: L.luminanceScale, min: 0, max: 2 },
    emitters: L.emitters,
    stripsInGlass: { value: L.stripsInGlass, label: 'strips in glass' },
    emitterScale: { value: L.emitterScale, min: 0, max: 1 },
    sweep: { value: L.sweep, min: 0, max: 1 },
    sweepRange: { value: L.sweepRange, min: 0, max: 200 },
  }))
  const [roam, setRoamPanel] = useControls('lights.roam', () => ({
    intensity: { value: L.roam.intensity, min: 0, max: 40 },
    color: L.roam.color,
    speed: { value: L.roam.speed, min: 0, max: 0.5 },
    size: { value: L.roam.size, min: 1, max: 40 },
    follow: { value: L.roam.follow, label: 'follow pointer' },
    body: { value: L.roam.body, label: 'show body' },
  }))
  const [oh, setOhPanel] = useControls('lights.overhead', () => ({
    color: L.overhead.color,
    intensity: { value: L.overhead.intensity, min: 0, max: 400 },
    position: { value: toV(L.overhead.position), step: 1 },
    target: { value: toV(L.overhead.target), step: 1 },
    angle: { value: L.overhead.angle, min: 1, max: 90 },
    penumbra: { value: L.overhead.penumbra, min: 0, max: 1 },
  }))
  const rect0 = useRectControls(L.rects[0]!)
  const rect1 = useRectControls(L.rects[1]!)
  const rect2 = useRectControls(L.rects[2]!)
  const rect3 = useRectControls(L.rects[3]!)

  /** Push a whole Tuning into every leva folder (initial load, preset, import, reset). */
  const fillPanel = useRef((t: Tuning) => {
    setGlassPanel(t.glass)
    setEnvPanel(t.env)
    setPostPanel(t.post)
    setLightsPanel({
      debug: t.lights.debug,
      luminanceScale: t.lights.luminanceScale,
      emitters: t.lights.emitters,
      stripsInGlass: t.lights.stripsInGlass,
      emitterScale: t.lights.emitterScale,
      sweep: t.lights.sweep,
      sweepRange: t.lights.sweepRange,
    })
    setRoamPanel(t.lights.roam)
    setOhPanel({
      ...t.lights.overhead,
      position: toV(t.lights.overhead.position),
      target: toV(t.lights.overhead.target),
    })
    ;[rect0, rect1, rect2, rect3].forEach((r, i) => {
      const src = t.lights.rects[i]
      if (src)
        r.setPanel({
          color: src.color,
          luminance: src.luminance,
          width: src.width,
          height: src.height,
          position: toV(src.position),
          rotation: toV(src.rotation),
        })
    })
  })

  // Initialise the panel from the store (saved JSON + localStorage), once.
  const initialised = useRef(false)
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    fillPanel.current(pickTuning(useTuning.getState()))
  }, [])

  // Preset select → store and panel (only when the user picked a different one).
  useEffect(() => {
    if (preset === useTuning.getState().preset) return
    applyPreset(preset)
    setGlassPanel(glassPresets[preset])
  }, [preset, applyPreset, setGlassPanel])
  // Store preset → select (page defaults, import, reset).
  const storePreset = useTuning((s) => s.preset)
  useEffect(() => {
    setPresetPanel({ preset: storePreset })
  }, [storePreset, setPresetPanel])
  // Edited or pristine?
  const storeGlass = useTuning((s) => s.glass)
  useEffect(() => {
    setPresetPanel({
      status: matchesPreset(storeGlass, storePreset) ? `${storePreset}, unchanged` : `${storePreset} + your edits`,
    })
  }, [storeGlass, storePreset, setPresetPanel])

  useControls(
    'file',
    () => ({
      'save to project': button(() => {
        const t = pickTuning(useTuning.getState())
        fetch('/__nav/tuning', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(t),
        })
          .then((r) =>
            r.ok
              ? console.info('[nav] tuning saved to src/nav/Nav3D/tuning.saved.json')
              : console.warn('[nav] save failed', r.status),
          )
          .catch((e) => console.warn('[nav] save failed', e))
      }),
      'export (clipboard)': button(() => {
        const json = JSON.stringify(pickTuning(useTuning.getState()), null, 2)
        navigator.clipboard?.writeText(json).then(
          () => console.info('[nav] tuning copied'),
          () => console.log(json),
        )
      }),
      'import (paste)': button(() => {
        const text = window.prompt('Paste tuning JSON')
        if (!text) return
        try {
          const t = pickTuning({ ...baseTuning, ...JSON.parse(text) })
          replace(t)
          fillPanel.current(t)
        } catch (e) {
          console.warn('[nav] import failed', e)
        }
      }),
      'reset to code defaults': button(() => {
        replace(baseTuning)
        fillPanel.current(baseTuning)
      }),
    }),
    // Pinned to the top of the panel.
    { order: -1 },
  )

  // Panel → store.
  useEffect(() => set('glass', glass as GlassTuning), [glass, set])
  useEffect(() => set('env', env), [env, set])
  useEffect(() => set('post', post), [post, set])
  useEffect(() => {
    set('lights', {
      ...lights,
      roam,
      overhead: { ...oh, position: fromV(oh.position), target: fromV(oh.target) },
      rects: [rect0.value, rect1.value, rect2.value, rect3.value],
    })
  }, [lights, roam, oh, rect0.value, rect1.value, rect2.value, rect3.value, set])

  return <Leva collapsed titleBar={{ title: 'nav 3D' }} />
}

type RectPanel = {
  color: string
  luminance: number
  width: number
  height: number
  position: V
  rotation: V
}

/** One leva folder per rect light, in Womp units: area (in), colour, luminance, rotation (deg), position (in). */
function useRectControls(d: RectLightTuning): {
  value: RectLightTuning
  setPanel: (v: Partial<RectPanel>) => void
} {
  const [c, setPanel] = useControls(`lights.rect: ${d.name}`, () => ({
    color: d.color,
    luminance: { value: d.luminance, min: 0, max: 100 },
    width: { value: d.width, min: 0.5, max: 2000, step: 0.5 },
    height: { value: d.height, min: 0.5, max: 2000, step: 0.5 },
    position: { value: toV(d.position), step: 1 },
    rotation: { value: toV(d.rotation), step: 5 },
  }))
  return {
    value: { name: d.name, ...c, position: fromV(c.position), rotation: fromV(c.rotation) },
    setPanel,
  }
}
