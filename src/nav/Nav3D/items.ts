import { createContext, useContext } from 'react'
import type { VanillaContainer } from '@react-three/uikit'

/** uikit elements of the layout items by id, so 3D decorations can follow them. */
export type ItemRegistry = Map<string, VanillaContainer>
export const ItemRegistryContext = createContext<ItemRegistry | null>(null)
export const useItemRegistry = () => useContext(ItemRegistryContext)
