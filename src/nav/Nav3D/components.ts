import * as THREE from 'three'

/**
 * Splits a geometry into its connected components (union-find over indices, with coincident
 * vertices joined). Useful for DCC exports that joined several objects into one mesh.
 */
export function splitComponents(g: THREE.BufferGeometry): THREE.BufferGeometry[] {
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
  const seen = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 1e3)},${Math.round(pos.getY(i) * 1e3)},${Math.round(pos.getZ(i) * 1e3)}`
    const j = seen.get(k)
    if (j === undefined) seen.set(k, i)
    else union(i, j)
  }
  const index = g.index
  const tri = index ? index.count : n
  const at = (i: number) => (index ? index.getX(i) : i)
  for (let t = 0; t < tri; t += 3) {
    union(at(t), at(t + 1))
    union(at(t + 1), at(t + 2))
  }
  // Bucket triangles by component root.
  const buckets = new Map<number, number[]>()
  for (let t = 0; t < tri; t += 3) {
    const r = find(at(t))
    let b = buckets.get(r)
    if (!b) buckets.set(r, (b = []))
    b.push(at(t), at(t + 1), at(t + 2))
  }
  const normal = g.attributes.normal as THREE.BufferAttribute | undefined
  const uv = g.attributes.uv as THREE.BufferAttribute | undefined
  return [...buckets.values()].map((tris) => {
    const remap = new Map<number, number>()
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const idx = tris.map((v) => {
      let m = remap.get(v)
      if (m === undefined) {
        m = remap.size
        remap.set(v, m)
        positions.push(pos.getX(v), pos.getY(v), pos.getZ(v))
        if (normal) normals.push(normal.getX(v), normal.getY(v), normal.getZ(v))
        if (uv) uvs.push(uv.getX(v), uv.getY(v))
      }
      return m
    })
    const out = new THREE.BufferGeometry()
    out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    if (normal) out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    if (uv) out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    out.setIndex(idx)
    out.computeBoundingBox()
    return out
  })
}

/** Bounding box of every connected component (ignoring slivers). */
export function connectedBoxes(g: THREE.BufferGeometry, minSize = 0.5): THREE.Box3[] {
  const v = new THREE.Vector3()
  return splitComponents(g)
    .map((c) => c.boundingBox!)
    .filter((b) => b.getSize(v).length() > minSize)
}
