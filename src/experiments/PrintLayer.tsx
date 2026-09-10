import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { transmissionExcluded } from '../nav/Nav3D/materials'

/**
 * The printed text painted onto a piece of glass, using that piece's own geometry and its
 * slab-space UVs. drei's transmission material runs its own shader and ignores `emissiveMap`
 * (its `emissive` would flood the whole surface), so the print is a second pass over the same
 * geometry rather than a channel of the glass material.
 *
 * `polygonOffset` keeps it off the glass surface without a z nudge that would shift the text
 * as a piece tumbles.
 */
/**
 * How far above 1.0 the ink is driven. The composer tone maps the frame with ACES, which
 * lands linear 1.0 at roughly 0.8 — so a "white" material can never reach white on screen.
 * Driving it to ~3 puts it at ~0.95 after the curve (≈250/255) while staying under the
 * sanitize pass's HDR clamp, and it changes nothing outside the glyphs.
 */
const ACES_GAIN = 3

export function usePrintMaterial(texture: THREE.Texture | null, ink: string) {
  const material = useMemo(() => {
    if (!texture) return null
    return new THREE.MeshBasicMaterial({
      map: texture,
      color: new THREE.Color(ink).multiplyScalar(ACES_GAIN),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      // Front faces only: an extruded piece carries the same UVs on its back and bevel faces,
      // and those ghosted and smeared the glyphs.
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  }, [texture, ink])
  useEffect(() => () => material?.dispose(), [material])
  return material
}

/**
 * Keeps a mesh out of the glass's transmission buffer. The print sits in front of the slab,
 * but a transmission pass renders every non-transmissive object regardless of depth, so the
 * glass was refracting a second, offset copy of the words behind the real ones.
 */
export function useExcludedFromTransmission(ref: React.RefObject<THREE.Object3D | null>) {
  useEffect(() => {
    const o = ref.current
    if (!o) return
    transmissionExcluded.add(o)
    return () => void transmissionExcluded.delete(o)
  }, [ref])
}

export function PrintLayer({
  geometry,
  material,
  position,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material | null
  position?: [number, number, number]
}) {
  const ref = useRef<THREE.Mesh>(null)
  useExcludedFromTransmission(ref)
  if (!material) return null
  return <mesh ref={ref} geometry={geometry} material={material} position={position} raycast={() => null} />
}
