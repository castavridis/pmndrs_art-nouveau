import { useMemo } from 'react'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { useGlassProps } from './materials'
import { makePillGeometry } from './pillGeometry'

export interface PillProps {
  /** Width in CSS px. */
  width: number
}

/**
 * Procedural pill: a rounded rectangle extruded with a small bevel. Caps have a fixed
 * radius (tokens.pillRadius); only the straight middle segment changes with width.
 */
export function Pill({ width }: PillProps) {
  const glass = useGlassProps()
  const geometry = useMemo(() => makePillGeometry(width), [width])
  return (
    <mesh geometry={geometry}>
      <MeshTransmissionMaterial {...glass} />
    </mesh>
  )
}
