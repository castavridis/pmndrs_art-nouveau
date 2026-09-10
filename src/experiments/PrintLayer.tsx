import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/**
 * The printed text painted onto a piece of glass, using that piece's own geometry and its
 * slab-space UVs. drei's transmission material runs its own shader and ignores `emissiveMap`
 * (its `emissive` would flood the whole surface), so the print is a second pass over the same
 * geometry rather than a channel of the glass material.
 *
 * `polygonOffset` keeps it off the glass surface without a z nudge that would shift the text
 * as a piece tumbles.
 */
export function usePrintMaterial(texture: THREE.Texture | null, ink: string) {
  const material = useMemo(() => {
    if (!texture) return null
    return new THREE.MeshBasicMaterial({
      map: texture,
      color: new THREE.Color(ink),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  }, [texture, ink])
  useEffect(() => () => material?.dispose(), [material])
  return material
}

export function PrintLayer({
  geometry,
  material,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material | null
}) {
  if (!material) return null
  return <mesh geometry={geometry} material={material} raycast={() => null} />
}
