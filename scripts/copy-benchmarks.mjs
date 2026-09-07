// Copies runtime data into public/ so the nav makes no third-party requests:
//  - detect-gpu's benchmark tables (GPU gate)
//  - three's draco decoder (gltfjsx --transform compresses the GLBs with draco)
import { cp, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire(import.meta.url)
const src = path.join(path.dirname(require.resolve('detect-gpu/package.json')), 'dist/benchmarks')
const dest = path.resolve('public/benchmarks')
await mkdir(dest, { recursive: true })
await cp(src, dest, { recursive: true })
console.log('copied detect-gpu benchmarks →', dest)
// three's package.json is not exported; resolve the entry and walk up from build/.
const dracoSrc = path.join(path.dirname(require.resolve('three')), '../examples/jsm/libs/draco/gltf')
const dracoDest = path.resolve('public/draco')
await mkdir(dracoDest, { recursive: true })
await cp(dracoSrc, dracoDest, { recursive: true })
console.log('copied draco decoder →', dracoDest)
