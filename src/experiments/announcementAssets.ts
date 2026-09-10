import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { px } from '../nav/tokens'
import { splitComponents } from '../nav/Nav3D/components'
// Note: the export named "left flourishes" holds the surface and "surface" holds the left
// flourishes; the generated files are named by content.
import surfaceUrl from '../nav/Nav3D/generated/announcement-surface-transformed.glb'
import leftUrl from '../nav/Nav3D/generated/announcement-left-transformed.glb'
import rightUrl from '../nav/Nav3D/generated/announcement-right-transformed.glb'

const DRACO = `${import.meta.env.BASE_URL}draco/`
const URLS = [surfaceUrl, leftUrl, rightUrl] as const

export interface AnnouncementAsset {
  /** Left flourishes (flower, bird-leaf, petal), origin at the surface's left end centre. */
  left: THREE.BufferGeometry
  /** Right flourishes (flower, tendril, petal), origin at the surface's right end centre. */
  right: THREE.BufferGeometry
  /**
   * Centre of the right flourish's blossom, in world units relative to that flourish's own
   * origin. It is the end's landmark, so the banner aligns it with the slab's edge.
   */
  rightAnchor: THREE.Vector3
  /** Exported surface size in CSS px. */
  width: number
  height: number
  depth: number
}

/**
 * The announcement exports share one space. The surface mesh is used only for measurements
 * (the surface itself is procedural, like the pill). Each flourish part was exported at its
 * own depth, some 250 units in front of the surface, which our close camera would throw out
 * of frame, so every part is flattened onto a thin stack just above the surface (keeping the
 * exported front-to-back order), then re-origined at the end it decorates.
 */
export function useAnnouncementAssets(): AnnouncementAsset {
  const gltfs = useGLTF([...URLS], DRACO)
  return useMemo(() => {
    // gltfjsx joins each export into one mesh; recover the individual pieces (flower, leaf, petal).
    const parts = (gltf: { scene: THREE.Object3D }) => {
      const out: THREE.BufferGeometry[] = []
      gltf.scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) {
          m.updateWorldMatrix(true, false)
          const g = m.geometry.clone()
          g.applyMatrix4(m.matrixWorld)
          out.push(...splitComponents(g))
          g.dispose()
        }
      })
      return out
    }
    const [surfaceParts, leftParts, rightParts] = gltfs.map(parts) as [
      THREE.BufferGeometry[],
      THREE.BufferGeometry[],
      THREE.BufferGeometry[],
    ]
    const surface = surfaceParts.length === 1 ? surfaceParts[0]! : mergeParts(surfaceParts)
    surface.computeBoundingBox()
    const sb = surface.boundingBox!
    const size = sb.getSize(new THREE.Vector3())
    const centre = sb.getCenter(new THREE.Vector3())
    const frontZ = sb.max.z

    /**
     * Flatten a flourish's parts onto a stack just above the surface, keeping the exported
     * front-to-back order, then re-origin at the end it decorates. Each layer clears the
     * previous part's own thickness: the right tendril is 37px deep, so a flat step buried
     * the blossom inside it and the tendril read as passing through the petals.
     *
     * Also returns that flourish's blossom centre — the biggest piece that is roughly as tall
     * as it is wide, the tendrils being long and thin — as the end's landmark.
     */
    const build = (list: THREE.BufferGeometry[], originX: number) => {
      const ordered = [...list].sort((a, b) => a.boundingBox!.min.z - b.boundingBox!.min.z)
      const GAP = 2
      let cursor = frontZ + GAP
      for (const g of ordered) {
        const b = g.boundingBox!
        g.translate(0, 0, cursor - b.min.z)
        cursor += b.max.z - b.min.z + GAP
      }
      const anchor = new THREE.Vector3()
      let best = -Infinity
      for (const g of ordered) {
        g.computeBoundingBox()
        const b = g.boundingBox!
        const sz = b.getSize(new THREE.Vector3())
        const aspect = Math.max(sz.x, sz.y) / Math.max(0.001, Math.min(sz.x, sz.y))
        const score = aspect < 1.6 ? sz.x * sz.y : 0
        if (score > best) {
          best = score
          b.getCenter(anchor)
        }
      }
      const g = ordered.length === 1 ? ordered[0]! : mergeParts(ordered)
      g.translate(-originX, -centre.y, -centre.z)
      g.scale(px(1), px(1), px(1))
      g.computeVertexNormals()
      g.computeBoundingBox()
      g.computeBoundingSphere()
      // The anchor rides the same transform.
      anchor.set(px(anchor.x - originX), px(anchor.y - centre.y), px(anchor.z - centre.z))
      return { geometry: g, anchor }
    }
    const end = size.y / 2
    const left = build(leftParts, sb.min.x + end)
    const right = build(rightParts, sb.max.x - end)
    surface.dispose()
    return { left: left.geometry, right: right.geometry, rightAnchor: right.anchor, width: size.x, height: size.y, depth: size.z }
  }, [gltfs])
}

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  let offset = 0
  for (const g of parts) {
    const p = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) positions.push(p.getX(i), p.getY(i), p.getZ(i))
    const idx = g.index
    if (idx) for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset)
    else for (let i = 0; i < p.count; i++) indices.push(i + offset)
    offset += p.count
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  return g
}

export function preloadAnnouncementAssets() {
  useGLTF.preload([...URLS], DRACO)
}
