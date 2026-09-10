import { useEffect, useMemo, type RefObject } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import type { VanillaContainer } from '@react-three/uikit'
import { useNavStore } from '../store'
import { tokens } from '../tokens'
import { uikitRect, useContrast } from './contrast'

export interface ItemContrastProps {
  /** Store key the reading is filed under: the item's id, or `logo`. */
  id: string
  /** The nav's own group, for turning an item's layout position into the canvas's pixels. */
  root: RefObject<THREE.Group | null>
  /** The uikit element whose box is measured. */
  element: () => VanillaContainer | null | undefined
  /** Fraction of the element's width and height measured, about its centre: where the glyphs are. */
  band: [number, number]
}

/**
 * Measures the glass behind one of the nav's labels (or its logo) and files the reading in the
 * nav's store, where the label, its key hint, the chip's veil and the scrim read it. The box is
 * the middle of the element (uikitRect), where the letters sit: for a label, clear of the
 * chip's bevelled top and bottom edges.
 *
 * The item under the selection chip reads against the chip, not the pill, and asks for a veil:
 * the chip arriving or leaving starts its history afresh, since the old readings were of other
 * glass.
 */
export function ItemContrast({ id, root, element, band }: ItemContrastProps) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const onChip = useNavStore((s) => (s.hovered ?? s.focused ?? s.active) === id)
  const setReading = useNavStore((s) => s.setReading)
  const at = useMemo(() => new THREE.Vector3(), [])
  const source = () => uikitRect(element(), root.current, tokens.pillDepth / 2, camera, size, band, at)
  const reading = useContrast(source, { veil: onChip, key: onChip, name: `nav: ${id}` })
  useEffect(() => {
    if (reading) setReading(id, reading)
  }, [id, reading, setReading])
  return null
}
