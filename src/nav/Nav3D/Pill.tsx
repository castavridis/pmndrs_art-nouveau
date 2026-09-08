import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshTransmissionMaterial } from '@react-three/drei'
import type { SpringValue } from '@react-spring/three'
import { registerTransmissionHost, useGlassProps } from './materials'
import { PillMorph } from './pillGeometry'

export interface PillProps {
  /** Width in CSS px; a spring value is sampled every frame. */
  width: number | SpringValue<number>
}

/**
 * Procedural pill: a rounded rectangle extruded with a small bevel. Caps have a fixed
 * radius (tokens.pillRadius); only the straight middle segment changes with width.
 */
export function Pill({ width }: PillProps) {
  const glass = useGlassProps()
  const morph = useMemo(() => new PillMorph(), [])
  const mesh = useRef<THREE.Mesh>(null)
  const scene = useThree((s) => s.scene)

  useEffect(() => () => morph.dispose(), [morph])
  useFrame(() => morph.setWidth(typeof width === 'number' ? width : width.get()))

  // Keep the text layer out of this material's transmission buffer.
  useEffect(() => {
    const m = mesh.current
    if (!m) return
    return registerTransmissionHost(scene, m, m.material as THREE.Material)
  }, [scene, glass])

  const mapKey = `${glass.sheenColorMap ? 's' : ''}${glass.roughnessMap ? 'r' : ''}`
  return (
    <mesh ref={mesh} geometry={morph.geometry}>
      {/* Remount when a map appears/disappears so the shader recompiles (see Glass.tsx). */}
      <MeshTransmissionMaterial key={mapKey} {...glass} />
    </mesh>
  )
}
