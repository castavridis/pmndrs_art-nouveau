import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { px } from '../nav/tokens'
import url from '../nav/Nav3D/generated/logo-cubed-transformed.glb'

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

/** Bounding box of every connected component (union-find over indices + coincident vertices). */
function connectedBoxes(g: THREE.BufferGeometry): THREE.Box3[] {
  const pos = g.attributes.position as THREE.BufferAttribute
  const n = pos.count
  const parent = new Int32Array(n)
  for (let i = 0; i < n; i++) parent[i] = i
  const find = (i: number) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!
      i = parent[i]!
    }
    return i
  }
  const union = (a: number, b: number) => {
    a = find(a)
    b = find(b)
    if (a !== b) parent[a] = b
  }
  // Coincident vertices (split for normals/uvs) belong together.
  const seen = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 1e3)},${Math.round(pos.getY(i) * 1e3)},${Math.round(pos.getZ(i) * 1e3)}`
    const j = seen.get(k)
    if (j === undefined) seen.set(k, i)
    else union(i, j)
  }
  const index = g.index
  if (index) {
    for (let t = 0; t < index.count; t += 3) {
      union(index.getX(t), index.getX(t + 1))
      union(index.getX(t + 1), index.getX(t + 2))
    }
  }
  const boxes = new Map<number, THREE.Box3>()
  const v = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    let b = boxes.get(r)
    if (!b) boxes.set(r, (b = new THREE.Box3()))
    b.expandByPoint(v.fromBufferAttribute(pos, i))
  }
  // Ignore slivers (a stray triangle or two).
  return [...boxes.values()].filter((b) => b.getSize(v).length() > 0.5)
}
