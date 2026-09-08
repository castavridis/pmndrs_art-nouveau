import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { px } from '../nav/tokens'
import url from '../nav/Nav3D/generated/logo-cubed-transformed.glb'
import { connectedBoxes } from '../nav/Nav3D/components'

const DRACO = `${import.meta.env.BASE_URL}draco/`

export interface LogoCubeAsset {
  geometry: THREE.BufferGeometry
  /** The model's closed blocks, in world units, centred like the geometry. */
  boxes: THREE.Box3[]
}

/**
 * "logo cubed.glb": one mesh made of four closed blocks (the pmndrs mark extruded).
 * Recentred at the origin and converted to world units (1 unit = 100 px, ~8 units tall).
 * The blocks are recovered as the mesh's connected components so things can be placed inside them.
 */
export function useLogoCube(): LogoCubeAsset {
  const gltf = useGLTF(url, DRACO)
  return useMemo(() => {
    let mesh: THREE.Mesh | undefined
    gltf.scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
    })
    if (!mesh) throw new Error('logo cubed: no mesh')
    mesh.updateWorldMatrix(true, false)
    const geometry = mesh.geometry.clone()
    geometry.applyMatrix4(mesh.matrixWorld)
    geometry.computeBoundingBox()
    const centre = geometry.boundingBox!.getCenter(new THREE.Vector3())
    geometry.translate(-centre.x, -centre.y, -centre.z)
    geometry.scale(px(1), px(1), px(1))
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    return { geometry, boxes: connectedBoxes(geometry) }
  }, [gltf])
}

export function preloadLogoCube() {
  useGLTF.preload(url, DRACO)
}
