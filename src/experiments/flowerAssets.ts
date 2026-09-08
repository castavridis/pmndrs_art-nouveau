import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { px } from '../nav/tokens'
import url from '../nav/Nav3D/generated/flower-lo-transformed.glb'

const DRACO = `${import.meta.env.BASE_URL}draco/`

/** flower.glb (simplified): one flat blossom, recentred at the origin, in world units (~4.8 wide). */
export function useFlower(): THREE.BufferGeometry {
  const gltf = useGLTF(url, DRACO)
  return useMemo(() => {
    let mesh: THREE.Mesh | undefined
    gltf.scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
    })
    if (!mesh) throw new Error('flower: no mesh')
    mesh.updateWorldMatrix(true, false)
    const g = mesh.geometry.clone()
    g.applyMatrix4(mesh.matrixWorld)
    g.computeBoundingBox()
    const c = g.boundingBox!.getCenter(new THREE.Vector3())
    g.translate(-c.x, -c.y, -c.z)
    g.scale(px(1), px(1), px(1))
    g.computeBoundingBox()
    g.computeBoundingSphere()
    return g
  }, [gltf])
}

export function preloadFlower() {
  useGLTF.preload(url, DRACO)
}
