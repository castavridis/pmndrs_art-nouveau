import { useEffect } from 'react'
import { button, useControls } from 'leva'
import { glassPresets, palette, type GlassTuning, type PaletteName } from '../nav/Nav3D/tuning'
import { usePaletteTuning } from '../nav/Nav3D/paletteTuning'

const NAMES = Object.keys(palette) as PaletteName[]

/** The subset of GlassTuning the palette page edits per colour. */
const FIELDS = [
  'color',
  'specularColor',
  'attenuationColor',
  'attenuationDistance',
  'sheenColor',
  'sheen',
  'sheenRoughness',
  'sheenNoise',
  'roughness',
  'transmission',
  'thickness',
  'ior',
  'iridescence',
  'chromaticAberration',
  'envMapIntensity',
  'opacity',
] as const
type Field = (typeof FIELDS)[number]
type Panel = Pick<GlassTuning, Field>

const pick = (g: GlassTuning): Panel => Object.fromEntries(FIELDS.map((k) => [k, g[k]])) as Panel

/** leva folders: one per palette colour, plus file actions. */
export default function PaletteControls() {
  useControls(
    'palette file',
    () => ({
      'save to project': button(() => {
        fetch('/__nav/palette', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(usePaletteTuning.getState().overrides),
        })
          .then((r) => (r.ok ? console.info('[nav] palette saved to src/nav/Nav3D/palette.saved.json') : console.warn('[nav] save failed', r.status)))
          .catch((e) => console.warn('[nav] save failed', e))
      }),
      'export (clipboard)': button(() => {
        const json = JSON.stringify(usePaletteTuning.getState().overrides, null, 2)
        navigator.clipboard?.writeText(json).then(
          () => console.info('[nav] palette copied'),
          () => console.log(json),
        )
      }),
      'reset to code presets': button(() => usePaletteTuning.getState().reset()),
    }),
    { order: 5 },
  )
  return (
    <>
      {NAMES.map((name) => (
        <Folder key={name} name={name} />
      ))}
    </>
  )
}

function Folder({ name }: { name: PaletteName }) {
  const set = usePaletteTuning((s) => s.set)
  const generation = usePaletteTuning((s) => s.generation)
  const initial = pick({ ...(glassPresets[name] as GlassTuning), ...usePaletteTuning.getState().overrides[name] })
  const [values, setPanel] = useControls(
    `palette.${name}`,
    () => ({
      color: initial.color,
      specularColor: initial.specularColor,
      attenuationColor: initial.attenuationColor,
      attenuationDistance: { value: initial.attenuationDistance, min: 0, max: 10 },
      sheenColor: initial.sheenColor,
      sheen: { value: initial.sheen, min: 0, max: 1 },
      sheenRoughness: { value: initial.sheenRoughness, min: 0, max: 1 },
      sheenNoise: { value: initial.sheenNoise, min: 0, max: 1 },
      roughness: { value: initial.roughness, min: 0, max: 1 },
      transmission: { value: initial.transmission, min: 0, max: 1 },
      thickness: { value: initial.thickness, min: 0, max: 2 },
      ior: { value: initial.ior, min: 1, max: 2.333 },
      iridescence: { value: initial.iridescence, min: 0, max: 1 },
      chromaticAberration: { value: initial.chromaticAberration, min: 0, max: 1 },
      envMapIntensity: { value: initial.envMapIntensity, min: 0, max: 4 },
      opacity: { value: initial.opacity, min: 0, max: 1 },
    }),
    { collapsed: true, order: 10 },
  )
  // Reset / import: re-read the store into the panel.
  useEffect(() => {
    if (generation === 0) return
    setPanel(pick({ ...(glassPresets[name] as GlassTuning), ...usePaletteTuning.getState().overrides[name] }))
  }, [generation, name, setPanel])
  // Panel → store: only fields that differ from the code preset are kept as overrides.
  useEffect(() => {
    const base = glassPresets[name] as GlassTuning
    const patch: Partial<GlassTuning> = {}
    for (const k of FIELDS) if (values[k] !== base[k]) (patch as Record<string, unknown>)[k] = values[k]
    set(name, patch)
  }, [values, name, set])
  return null
}
