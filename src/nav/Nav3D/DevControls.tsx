import { useEffect, useRef } from 'react'
import { useControls, folder, button, Leva } from 'leva'
import {
  useTuning,
  defaultTuning,
  baseSchemes,
  glassPresets,
  pickSchemes,
  matchesPreset,
  palette,
  pickTuning,
  type GlassTuning,
  type RectLightTuning,
  type Tuning,
  type Vec3,
} from './tuning'
import { useOutlines } from '../outlines'
import { isBuiltInPreset, presetNames, useCustomPresets } from './customPresets'
import { useLcReadings } from './lcStore'
import { useHitDebug } from './aim'
import { HitDebugOverlay } from './HitDebugOverlay'

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
  const scheme = useTuning((s) => s.scheme)
  const copyToOther = useTuning((s) => s.copyToOther)
  const inkChoice = useTuning((s) => s.env.ink)
  const hitDebugOn = useHitDebug((s) => s.enabled)
  const setHitDebug = useHitDebug((s) => s.setEnabled)
  const [{ outlines, hits: hitsPanel, ink: inkPanel }, setViewPanel] = useControls(
    'view',
    () => ({
      outlines: { value: overlay, label: 'svg outlines' },
      hits: { value: hitDebugOn, label: 'hit debug' },
      ink: { value: inkChoice, options: ['auto', 'light', 'dark'] as const, label: 'text ink' },
      lc: { value: '', editable: false, label: 'Lc (median/worst)' },
      scheme: { value: scheme, editable: false, label: 'tuning for' },
      'copy to other scheme': button(() => copyToOther()),
    }),
    { order: -80 },
  )
  useEffect(() => setViewPanel({ scheme }), [scheme, setViewPanel])
  useEffect(() => setHitDebug(hitsPanel), [hitsPanel, setHitDebug])
  useEffect(() => set('env', { ink: inkPanel }), [inkPanel, set])
  useEffect(() => setViewPanel({ ink: inkChoice }), [inkChoice, setViewPanel])
  // Live legibility readings from the in-canvas probes (LcProbe.tsx), refreshed as they arrive.
  const readings = useLcReadings((s) => s.readings)
  useEffect(() => {
    const text = Object.entries(readings)
      .map(([k, v]) => `${k.replace('nav: ', '')} ${v.median}/${v.worst}${v.worst < 60 ? ' ✕' : v.worst < 75 ? ' ~' : ''}`)
      .join(' · ')
    setViewPanel({ lc: text || '—' })
  }, [readings, setViewPanel])
  useEffect(() => setOverlay(outlines), [outlines, setOverlay])
  useEffect(() => setViewPanel({ outlines: overlay }), [overlay, setViewPanel])

  // Built-in presets plus the user's own (panel "presets" folder); the select rebuilds when
  // the list changes.
  const custom = useCustomPresets((s) => s.presets)
  const names = presetNames(custom)
  const [{ preset }, setPresetPanel] = useControls(
    () => ({
      preset: { value: useTuning.getState().preset, options: names, order: -100 },
      status: { value: '', editable: false, order: -99 },
    }),
    [names.join('|')],
  )
  useControls(
    'presets',
    () => ({
      'save current as new…': button(() => {
        const name = window.prompt('Preset name')?.trim()
        if (!name) return
        if (isBuiltInPreset(name)) return window.alert(`"${name}" is a built-in preset; pick another name.`)
        const st = useTuning.getState()
        useCustomPresets.getState().add(name, st.glass)
        st.applyPreset(name)
      }),
      'update current preset': button(() => {
        const st = useTuning.getState()
        if (isBuiltInPreset(st.preset)) return window.alert('Built-in presets are code; save the look as a new preset instead.')
        useCustomPresets.getState().add(st.preset, st.glass)
      }),
      'delete current preset': button(() => {
        const st = useTuning.getState()
        if (isBuiltInPreset(st.preset)) return window.alert('Built-in presets cannot be deleted.')
        if (!window.confirm(`Delete preset "${st.preset}"?`)) return
        useCustomPresets.getState().remove(st.preset)
        st.applyPreset(nearestBuiltIn(st.glass))
      }),
      'save presets to project': button(() => {
        fetch('/__nav/presets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(useCustomPresets.getState().presets),
        })
          .then((r) => (r.ok ? console.info('[nav] presets saved to src/nav/Nav3D/presets.saved.json') : console.warn('[nav] save failed', r.status)))
          .catch((e) => console.warn('[nav] save failed', e))
      }),
    }),
    { order: -20 },
  )

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
  }), { order: -70 })

  const M = defaultTuning.motion
  const [motion, setMotionPanel] = useControls('motion', () => ({
    speed: { value: M.speed, min: 0, max: 4 },
    spin: { value: M.spin, min: 0, max: 4 },
    sway: { value: M.sway, min: 0, max: 4 },
    stir: { value: M.stir, min: 0, max: 4, label: 'pointer stir' },
    stirRadius: { value: M.stirRadius, min: 0.1, max: 4, label: 'stir radius' },
  }), { order: -62 })
  // Materials per GLB part, and the pools the petal / flower swarms draw from. The pools are
  // checkboxes over the palette colours plus any user presets; folders rebuild when that list
  // changes.
  const MAT = defaultTuning.materials
  const choices = ['live', ...names]
  const [mat, setMatPanel] = useControls(
    'materials',
    () => ({
      clusters: { value: MAT.clusters, options: choices },
      loosePetals: { value: MAT.loosePetals, options: choices, label: 'loose petals' },
      flourishes: { value: MAT.flourishes, options: choices, label: 'announcement flourishes' },
      indicator: { value: MAT.indicator, options: names },
      model: { value: MAT.model, options: choices, label: 'cube model' },
      callout: { value: MAT.callout, options: ['live', 'kind', ...names], label: 'callout surface' },
      calloutLens: { value: MAT.calloutLens, options: ['live', 'kind', ...names], label: 'callout lens' },
      calloutLeafTop: { value: MAT.calloutLeafTop, options: ['live', 'kind', ...names], label: 'callout leaf (top right)' },
      calloutLeafBottom: { value: MAT.calloutLeafBottom, options: ['live', 'kind', ...names], label: 'callout leaf (bottom)' },
    }),
    { order: -61 },
    [names.join('|')],
  )
  const poolNames = [...(Object.keys(palette) as string[]), ...names.filter((n) => !isBuiltInPreset(n))]
  const poolSchema = (list: string[]) => Object.fromEntries(poolNames.map((n) => [n, list.includes(n)]))
  const [petalPool, setPetalPool] = useControls('materials.petals', () => poolSchema(MAT.petals), { order: -60 }, [poolNames.join('|')])
  const [flowerPool, setFlowerPool] = useControls('materials.flowers', () => poolSchema(MAT.flowers), { order: -59 }, [poolNames.join('|')])
  const [env, setEnvPanel] = useControls('environment', () => ({
    intensity: { value: defaultTuning.env.intensity, min: 0, max: 4 },
    rotation: { value: defaultTuning.env.rotation, min: -Math.PI, max: Math.PI },
    background: defaultTuning.env.background,
    fog: { value: defaultTuning.env.fog, min: 0, max: 0.3, step: 0.001 },
    labelScrim: { value: defaultTuning.env.labelScrim, min: 0, max: 0.9, label: 'label scrim' },
  }), { order: -40 })
  const [post, setPostPanel] = useControls('post', () => ({
    bloomIntensity: { value: defaultTuning.post.bloomIntensity, min: 0, max: 2 },
    bloomThreshold: { value: defaultTuning.post.bloomThreshold, min: 0, max: 1 },
    bloomSmoothing: { value: defaultTuning.post.bloomSmoothing, min: 0, max: 1 },
    bloomRadius: { value: defaultTuning.post.bloomRadius, min: 0, max: 1 },
    bloomClamp: { value: defaultTuning.post.bloomClamp, min: 1, max: 100, label: 'bloom clamp (HDR)' },
    aberration: { value: defaultTuning.post.aberration, min: 0, max: 0.01, step: 0.0001 },
    noise: { value: defaultTuning.post.noise, min: 0, max: 1 },
    noiseBlend: { value: defaultTuning.post.noiseBlend, options: ['screen', 'overlay', 'softLight', 'add', 'multiply', 'normal'] as const },
    noisePremultiply: { value: defaultTuning.post.noisePremultiply, label: 'noise premultiply' },
  }), { order: -30 })

  const [lights, setLightsPanel] = useControls('lights', () => ({
    debug: L.debug,
    luminanceScale: { value: L.luminanceScale, min: 0, max: 2 },
    emitters: L.emitters,
    stripsInGlass: { value: L.stripsInGlass, label: 'strips in glass' },
    emitterScale: { value: L.emitterScale, min: 0, max: 1 },
    sweep: { value: L.sweep, min: 0, max: 1 },
    sweepRange: { value: L.sweepRange, min: 0, max: 200 },
  }), { order: -50 })
  const [ray, setRayPanel] = useControls('lights.ray', () => ({
    enabled: { value: L.ray.enabled, label: 'on' },
    intensity: { value: L.ray.intensity, min: 0, max: 60 },
    color: L.ray.color,
    cone: { value: L.ray.cone, min: 2, max: 60 },
    softness: { value: L.ray.softness, min: 0, max: 1 },
    speed: { value: L.ray.speed, min: 0, max: 0.5 },
  }), { order: -55 })
  const [roam, setRoamPanel] = useControls('lights.roam', () => ({
    intensity: { value: L.roam.intensity, min: 0, max: 40 },
    mode: { value: L.roam.mode, options: ['solid', 'rainbow'] as const },
    color: L.roam.color,
    rainbowRate: { value: L.roam.rainbowRate, min: 0.02, max: 3, label: 'rainbow rate' },
    speed: { value: L.roam.speed, min: 0, max: 0.5 },
    size: { value: L.roam.size, min: 1, max: 40 },
    z: { value: L.roam.z, min: -10, max: 30, step: 0.1, label: 'depth (z)' },
    follow: { value: L.roam.follow, label: 'follow pointer' },
    hover: { value: L.roam.hover, label: 'go to hovered petal' },
    hoverOffset: { value: L.roam.hoverOffset, min: 0, max: 3, step: 0.05, label: 'hover offset' },
    body: { value: L.roam.body, label: 'show body' },
  }), { order: -60 })
  const [oh, setOhPanel] = useControls('lights.overhead', () => ({
    color: L.overhead.color,
    intensity: { value: L.overhead.intensity, min: 0, max: 1000 },
    position: { value: toV(L.overhead.position), step: 1 },
    target: { value: toV(L.overhead.target), step: 1 },
    angle: { value: L.overhead.angle, min: 1, max: 90 },
    penumbra: { value: L.overhead.penumbra, min: 0, max: 1 },
  }), { order: -10 })
  const rect0 = useRectControls(L.rects[0]!)
  const rect1 = useRectControls(L.rects[1]!)
  const rect2 = useRectControls(L.rects[2]!)
  const rect3 = useRectControls(L.rects[3]!)

  /** Push a whole Tuning into every leva folder (initial load, preset, import, reset). */
  const fillPanel = useRef((t: Tuning) => {
    setGlassPanel(t.glass)
    setMotionPanel(t.motion)
    setMatPanel({ clusters: t.materials.clusters, loosePetals: t.materials.loosePetals, flourishes: t.materials.flourishes, indicator: t.materials.indicator, model: t.materials.model, callout: t.materials.callout, calloutLens: t.materials.calloutLens, calloutLeafTop: t.materials.calloutLeafTop, calloutLeafBottom: t.materials.calloutLeafBottom })
    setPetalPool(poolSchema(t.materials.petals))
    setFlowerPool(poolSchema(t.materials.flowers))
    // `ink` lives in the view folder, not the environment one.
    setEnvPanel({ intensity: t.env.intensity, rotation: t.env.rotation, background: t.env.background, fog: t.env.fog, labelScrim: t.env.labelScrim })
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
    setRayPanel(t.lights.ray)
    setOhPanel({
      ...t.lights.overhead,
      position: toV(t.lights.overhead.position),
      target: toV(t.lights.overhead.target),
    })
    ;[rect0, rect1, rect2, rect3].forEach((r, i) => {
      const src = t.lights.rects[i]
      if (src)
        r.setPanel({
          follow: src.followActive ?? false,
          color: src.color,
          luminance: src.luminance,
          width: src.width,
          height: src.height,
          position: toV(src.position),
          rotation: toV(src.rotation),
        })
    })
  })

  // Initialise the panel from the store (saved JSON + localStorage), and again whenever the
  // page theme swaps the active scheme (light / dark carry separate values).
  // The store is the source of truth at mount: the panel's schema defaults must not be
  // pushed back before the fill has landed, so the panel → store effects below stay off
  // until after this commit (they run in the same pass; the microtask lands after it).
  const live = useRef(false)
  useEffect(() => {
    live.current = false
    fillPanel.current(pickTuning(useTuning.getState()))
    queueMicrotask(() => void (live.current = true))
  }, [scheme])

  // Preset select → store and panel (only when the user picked a different one).
  useEffect(() => {
    if (preset === useTuning.getState().preset) return
    applyPreset(preset)
    setGlassPanel(useTuning.getState().glass)
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
        // Both schemes ship: { dark, light }.
        const t = pickSchemes(useTuning.getState())
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
          const t = pickTuning({ ...baseSchemes[useTuning.getState().scheme], ...JSON.parse(text) })
          replace(t)
          fillPanel.current(t)
        } catch (e) {
          console.warn('[nav] import failed', e)
        }
      }),
      'reset to code defaults': button(() => {
        const base = baseSchemes[useTuning.getState().scheme]
        replace(base)
        fillPanel.current(base)
      }),
    }),
    // Right under the preset select: saving is the most frequent action after tuning.
    { order: -90 },
  )

  // Panel → store (skipped during the mount / scheme-swap commit, see `live`).
  useEffect(() => void (live.current && set('glass', glass as GlassTuning)), [glass, set])
  useEffect(() => void (live.current && set('env', env)), [env, set])
  useEffect(() => void (live.current && set('motion', motion)), [motion, set])
  const petalsSig = JSON.stringify(petalPool)
  const flowersSig = JSON.stringify(flowerPool)
  useEffect(() => {
    if (!live.current) return
    set('materials', {
      ...mat,
      petals: Object.entries(petalPool).filter(([, on]) => on).map(([n]) => n),
      flowers: Object.entries(flowerPool).filter(([, on]) => on).map(([n]) => n),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mat, petalsSig, flowersSig, set])
  useEffect(() => void (live.current && set('post', post)), [post, set])
  // Keyed on a signature: leva hands back fresh objects each render, and pushing on every
  // render would overwrite store changes made elsewhere (scripts, page defaults) at once.
  const lightsSig = JSON.stringify([lights, roam, ray, oh, rect0.value, rect1.value, rect2.value, rect3.value])
  useEffect(() => {
    if (!live.current) return
    set('lights', {
      ...lights,
      roam,
      ray,
      overhead: { ...oh, position: fromV(oh.position), target: fromV(oh.target) },
      rects: [rect0.value, rect1.value, rect2.value, rect3.value],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightsSig, set])

  return (
    <>
      <Leva collapsed titleBar={{ title: 'nav 3D' }} />
      <HitDebugOverlay />
    </>
  )
}

type RectPanel = {
  follow: boolean
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
    follow: { value: d.followActive ?? false, label: 'aim at current page' },
    color: d.color,
    luminance: { value: d.luminance, min: 0, max: 100 },
    width: { value: d.width, min: 0.5, max: 2000, step: 0.5 },
    height: { value: d.height, min: 0.5, max: 2000, step: 0.5 },
    position: { value: toV(d.position), step: 1 },
    rotation: { value: toV(d.rotation), step: 5 },
  }), { order: d.name === 'overhead' ? -45 : 0 })
  const { follow, ...rest } = c
  return {
    value: { name: d.name, ...rest, followActive: follow, position: fromV(c.position), rotation: fromV(c.rotation) },
    setPanel,
  }
}

/** The built-in preset closest to `glass` (fallback after deleting a user preset). */
function nearestBuiltIn(glass: GlassTuning): keyof typeof glassPresets {
  let best: keyof typeof glassPresets = 'silverGlass'
  let bestDiff = Infinity
  for (const name of Object.keys(glassPresets) as (keyof typeof glassPresets)[]) {
    const p = glassPresets[name] as GlassTuning
    const diff = (Object.keys(p) as (keyof GlassTuning)[]).filter((k) => glass[k] !== p[k]).length
    if (diff < bestDiff) {
      best = name
      bestDiff = diff
    }
  }
  return best
}
