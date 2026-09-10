import { createContext, useContext } from 'react'
import type { VanillaContainer } from '@react-three/uikit'
import { useNavStore } from '../store'
import type { InkSet } from './contrast'
import { INKS, useNavInk } from './dom'

/** uikit elements of the layout items by id, so 3D decorations can follow them. */
export type ItemRegistry = Map<string, VanillaContainer>
export const ItemRegistryContext = createContext<ItemRegistry | null>(null)
export const useItemRegistry = () => useContext(ItemRegistryContext)

/** The ink set for an item's label: as measured behind it (NavContrast.tsx), else the nav's guess. */
export function useItemInk(id: string): InkSet {
  const fallback = useNavInk()
  const reading = useNavStore((s) => s.readings[id])
  return reading ? INKS[reading.scheme] : fallback
}
