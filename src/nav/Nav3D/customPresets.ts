import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import savedJson from './presets.saved.json'
import { glassPresets, type GlassPreset, type GlassTuning } from './tuning'

/** A built-in preset name or a user-defined one (see the panel's "presets" folder). */
export type PresetName = GlassPreset | (string & {})

interface CustomPresetsStore {
  presets: Record<string, GlassTuning>
  add: (name: string, glass: GlassTuning) => void
  remove: (name: string) => void
}

/** Shipped user presets: presets.saved.json, written by "save presets to project". */
const saved = savedJson as Record<string, GlassTuning>

const init = (set: (fn: (s: CustomPresetsStore) => Partial<CustomPresetsStore>) => void): CustomPresetsStore => ({
  presets: saved,
  add: (name, glass) => set((s) => ({ presets: { ...s.presets, [name]: glass } })),
  remove: (name) =>
    set((s) => {
      const presets = { ...s.presets }
      delete presets[name]
      return { presets }
    }),
})

// Dev: unsaved presets survive reloads. Prod: the saved JSON only.
export const useCustomPresets = import.meta.env.DEV
  ? create<CustomPresetsStore>()(
      persist(init, {
        name: 'custom-presets',
        partialize: (s) => ({ presets: s.presets }),
        merge: (persisted, current) => ({
          ...current,
          presets: { ...saved, ...((persisted as Partial<CustomPresetsStore>)?.presets ?? {}) },
        }),
      }),
    )
  : create<CustomPresetsStore>()(init)

export const isBuiltInPreset = (name: string): name is GlassPreset => name in glassPresets

/** Built-in first, then user presets; undefined for an unknown name. */
export function getPreset(name: string): GlassTuning | undefined {
  if (isBuiltInPreset(name)) return glassPresets[name] as GlassTuning
  return useCustomPresets.getState().presets[name]
}

/** Every preset name, built-ins first. */
export function presetNames(custom = useCustomPresets.getState().presets): string[] {
  return [...Object.keys(glassPresets), ...Object.keys(custom).filter((n) => !isBuiltInPreset(n))]
}
