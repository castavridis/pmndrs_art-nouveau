import * as THREE from 'three'

/**
 * Tileable low-frequency value-noise normal map. Gives the glass a barely-there waviness so
 * reflections and thin-film colour drift across an otherwise flat face.
 */
export function makeSurfaceNormalMap(size = 256, octaves = 3, amplitude = 1): THREE.DataTexture {
  const h = new Float32Array(size * size)
  let seed = 1337
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  // Value noise: random lattice per octave, bilinear + smoothstep.
  for (let o = 0; o < octaves; o++) {
    const cells = 4 << o
    const lattice = new Float32Array(cells * cells)
    for (let i = 0; i < lattice.length; i++) lattice[i] = rnd()
    const amp = 1 / (1 << o)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells
        const fy = (y / size) * cells
        const x0 = Math.floor(fx)
        const y0 = Math.floor(fy)
        const tx = smooth(fx - x0)
        const ty = smooth(fy - y0)
        const v = (xx: number, yy: number) => lattice[(yy % cells) * cells + (xx % cells)]
        const a = v(x0, y0)
        const b = v(x0 + 1, y0)
        const c = v(x0, y0 + 1)
        const d = v(x0 + 1, y0 + 1)
        h[y * size + x] += amp * ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty)
      }
    }
  }
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)]
      const r = h[y * size + ((x + 1) % size)]
      const u = h[((y - 1 + size) % size) * size + x]
      const dn = h[((y + 1) % size) * size + x]
      const n = new THREE.Vector3((l - r) * amplitude, (u - dn) * amplitude, 1).normalize()
      const i = (y * size + x) * 4
      data[i] = (n.x * 0.5 + 0.5) * 255
      data[i + 1] = (n.y * 0.5 + 0.5) * 255
      data[i + 2] = (n.z * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

const smooth = (t: number) => t * t * (3 - 2 * t)
