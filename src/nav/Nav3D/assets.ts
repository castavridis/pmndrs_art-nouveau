import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { px } from '../tokens'
import navbarUrl from './generated/navbar-transformed.glb'
import leftUrl from './generated/left-transformed.glb'
import rightUrl from './generated/right-transformed.glb'
import petalUrl from './generated/petal-transformed.glb'
import petalLoUrl from './generated/petal-lo-transformed.glb'

/**
 * Loads the exported GLBs and normalises them into the nav's coordinate system.
 *
 * The DCC export (see generated/README.md) puts every mesh in one absolute space where
 * 1 unit ≈ 1 CSS px, viewed from behind. Here each geometry is cloned and baked so that:
 *  - the scene is rotated 180° about Y (so "Left Side" lands on screen-left, normals intact)
 *  - units become world units (`px()`), i.e. 1/tokens.pxPerUnit
 *  - the origin of `left` / `right` is the centre of the pill cap it decorates
 *  - the origin of `petal` is the petal's own centre
 * so components only ever position them, never scale them (CLAUDE.md: no distortion).
 */
export interface NavAssets {
  left: THREE.BufferGeometry
  right: THREE.BufferGeometry
  petal: THREE.BufferGeometry
  /** Simplified petal (~8% of the vertices) for the instanced petal field. */
  petalLo: THREE.BufferGeometry
  /** Pill dimensions as exported, in CSS px, for reference / sanity checks. */
  exported: { width: number; height: number; depth: number }
}

const URLS = [navbarUrl, leftUrl, rightUrl, petalUrl, petalLoUrl] as const
/** Self-hosted draco decoder (see scripts/copy-benchmarks.mjs); drei@10 defaults to a Google CDN. */
const DRACO = `${import.meta.env.BASE_URL}draco/`

export function useNavAssets(): NavAssets {
  const gltfs = useGLTF([...URLS], DRACO)
  return useMemo(() => normalise(gltfs.map(firstMesh)), [gltfs])
}

export function preloadNavAssets() {
  useGLTF.preload([...URLS], DRACO)
}

type GLTFLike = { scene: THREE.Object3D }

function firstMesh(gltf: GLTFLike): THREE.Mesh {
  let mesh: THREE.Mesh | undefined
  gltf.scene.traverse((o) => {
    if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
  })
  if (!mesh) throw new Error('nav asset has no mesh')
  return mesh
}

const FLIP = new THREE.Matrix4().makeRotationY(Math.PI)

function normalise([navbar, left, right, petal, petalLo]: THREE.Mesh[]): NavAssets {
  // World-space geometry of each mesh (bake node transforms), flipped to face our camera.
  const world = (m: THREE.Mesh) => {
    m.updateWorldMatrix(true, false)
    const g = m.geometry.clone()
    g.applyMatrix4(m.matrixWorld)
    g.applyMatrix4(FLIP)
    g.computeBoundingBox()
    return g
  }
  const nav = world(navbar)
  const nb = nav.boundingBox!
  const centre = nb.getCenter(new THREE.Vector3())
  const size = nb.getSize(new THREE.Vector3())
  const halfW = size.x / 2
  const radius = size.y / 2

  // Re-origin a geometry at `origin` (absolute, flipped units) and convert to world units.
  const rebase = (g: THREE.BufferGeometry, origin: THREE.Vector3) => {
    g.translate(-origin.x, -origin.y, -origin.z)
    g.scale(px(1), px(1), px(1))
    g.computeBoundingBox()
    g.computeBoundingSphere()
    return g
  }

  const leftCap = new THREE.Vector3(centre.x - (halfW - radius), centre.y, centre.z)
  const rightCap = new THREE.Vector3(centre.x + (halfW - radius), centre.y, centre.z)

  const petalG = world(petal)
  const petalCentre = petalG.boundingBox!.getCenter(new THREE.Vector3())
  const petalLoG = world(petalLo)

  return {
    left: rebase(world(left), leftCap),
    right: rebase(world(right), rightCap),
    petal: rebase(petalG, petalCentre),
    petalLo: rebase(petalLoG, petalCentre),
    exported: { width: size.x, height: size.y, depth: size.z },
  }
}
