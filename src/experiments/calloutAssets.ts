import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { px } from '../nav/tokens'
import lensUrl from '../nav/Nav3D/generated/callout-lens-transformed.glb'
import leafTopUrl from '../nav/Nav3D/generated/callout-leaf-top-transformed.glb'
import leafBottomUrl from '../nav/Nav3D/generated/callout-leaf-bottom-transformed.glb'

const DRACO = `${import.meta.env.BASE_URL}draco/`
const URLS = [lensUrl, leafTopUrl, leafBottomUrl] as const
/** Same back-to-front export as the nav assets. */
const FLIP = new THREE.Matrix4().makeRotationY(Math.PI)

export interface CalloutIconAsset {
  lens: THREE.BufferGeometry
  leafTop: THREE.BufferGeometry
  leafBottom: THREE.BufferGeometry
  /** Lens diameter in world units (icon size reference). */
  size: number
}

/**
 * The callout icon: a lens ring with a leaf curling in front and another behind. The three
 * exports share the nav's absolute space; they are flipped like the nav meshes, re-origined
 * at the lens centre and converted to world units, so the ring is centred on the origin and
 * the leaves keep their exported offsets.
 */
export function useCalloutIcon(): CalloutIconAsset {
  const gltfs = useGLTF([...URLS], DRACO)
  return useMemo(() => {
    const world = (gltf: { scene: THREE.Object3D }) => {
      let mesh: THREE.Mesh | undefined
      gltf.scene.traverse((o) => {
        if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
      })
      if (!mesh) throw new Error('callout asset has no mesh')
      mesh.updateWorldMatrix(true, false)
      const g = mesh.geometry.clone()
      g.applyMatrix4(mesh.matrixWorld)
      g.applyMatrix4(FLIP)
      g.computeBoundingBox()
      return g
    }
    const [lens, leafTop, leafBottom] = gltfs.map(world) as [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry]
    const centre = lens.boundingBox!.getCenter(new THREE.Vector3())
    const size = lens.boundingBox!.getSize(new THREE.Vector3())
    for (const g of [lens, leafTop, leafBottom]) {
      g.translate(-centre.x, -centre.y, -centre.z)
      g.scale(px(1), px(1), px(1))
      g.computeBoundingBox()
      g.computeBoundingSphere()
    }
    return { lens, leafTop, leafBottom, size: px(Math.max(size.x, size.y)) }
  }, [gltfs])
}

export function preloadCalloutIcon() {
  useGLTF.preload([...URLS], DRACO)
}
