import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import savedJson from './palette.saved.json'
import { glassPresets, palette, useTuning, type GlassTuning, type PaletteName } from './tuning'
import { getPreset, useCustomPresets, type PresetName } from './customPresets'

/** Per-colour edits on top of the code presets (see /dev/palette). */
export type PaletteOverrides = Partial<Record<PaletteName, Partial<GlassTuning>>>

/** Shipped edits: palette.saved.json, written by the palette page's "save to project". */
export const savedPalette: PaletteOverrides = savedJson as PaletteOverrides

interface PaletteStore {
  overrides: PaletteOverrides
  /** Bumped by reset so panels re-read their values. */
  generation: number
  set: (name: PaletteName, patch: Partial<GlassTuning>) => void
  replace: (overrides: PaletteOverrides) => void
  reset: () => void
}

const init = (set: (fn: (s: PaletteStore) => Partial<PaletteStore>) => void): PaletteStore => ({
  overrides: savedPalette,
  generation: 0,
  set: (name, patch) => set((s) => ({ overrides: { ...s.overrides, [name]: { ...s.overrides[name], ...patch } } })),
  replace: (overrides) => set((s) => ({ overrides, generation: s.generation + 1 })),
  reset: () => set((s) => ({ overrides: {}, generation: s.generation + 1 })),
})

// Dev: unsaved edits survive reloads. Prod: the saved JSON only.
export const usePaletteTuning = import.meta.env.DEV
  ? create<PaletteStore>()(persist(init, { name: 'palette-tuning', partialize: (s) => ({ overrides: s.overrides }) }))
  : create<PaletteStore>()(init)

export const isPaletteName = (name: string): name is PaletteName => name in palette

/** A preset's glass with the palette page's edits applied (non-palette presets pass through). */
export function resolvePreset(name: PresetName, overrides: PaletteOverrides = usePaletteTuning.getState().overrides): GlassTuning {
  const base = getPreset(name) ?? (glassPresets.silverGlass as GlassTuning)
  const o = isPaletteName(name) ? overrides[name] : undefined
  return o ? { ...base, ...o } : base
}

/** Reactive form of resolvePreset. */
export function usePresetGlass(name: PresetName): GlassTuning {
  const o = usePaletteTuning((s) => (isPaletteName(name) ? s.overrides[name] : undefined))
  const custom = useCustomPresets((s) => s.presets[name])
  return useMemo(() => {
    const base = getPreset(name) ?? custom ?? (glassPresets.silverGlass as GlassTuning)
    return o ? { ...base, ...o } : base
  }, [name, o, custom])
}

/**
 * The glass the nav bar wears (materials.navbar): the live tuning by default, or a preset. The
 * pill and the nav's ink both read this, so the labels are inked for the glass they sit on.
 */
export function useNavbarGlass(): GlassTuning {
  const choice = useTuning((s) => s.materials.navbar)
  const live = useTuning((s) => s.glass)
  const preset = usePresetGlass(choice === 'live' ? 'silverGlass' : choice)
  return choice === 'live' ? live : preset
}
