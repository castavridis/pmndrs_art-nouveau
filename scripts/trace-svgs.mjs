// Renders each component flat on /dev/trace, traces the alpha edge and writes SVG fallbacks
// to src/nav/assets/fallback/<asset>.svg plus a manifest with px sizes and origins.
// Usage: dev server on :5173, then `node scripts/trace-svgs.mjs [asset ...]`
import { chromium } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ASSETS = ['nav-left', 'nav-right', 'petal', 'flower', 'logo-cube', 'callout-icon', 'announcement-left', 'announcement-right']
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : ASSETS
const outDir = path.resolve('src/nav/assets/fallback')
await mkdir(outDir, { recursive: true })

const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1700, height: 1700 }, deviceScaleFactor: 1 })
// Merge into the existing manifest so tracing one asset keeps the others' entries.
const manifestPath = path.join(outDir, 'manifest.json')
const manifest = await readFile(manifestPath, 'utf8').then(JSON.parse).catch(() => ({}))
for (const asset of wanted) {
  await p.goto(`http://localhost:5173/dev/trace?asset=${asset}`)
  await p.waitForFunction((a) => window.__trace?.asset === a, asset, { timeout: 30000 })
  // Wait until the asset has actually been drawn (alpha present in the canvas).
  await p.waitForFunction(() => {
    const gl = document.querySelector('canvas')
    const c = document.createElement('canvas'); c.width = 64; c.height = 64
    const ctx = c.getContext('2d'); ctx.drawImage(gl, 0, 0, 64, 64)
    const d = ctx.getImageData(0, 0, 64, 64).data
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true
    return false
  }, null, { timeout: 30000 })
  await p.waitForTimeout(200)
  const result = await p.evaluate(() => {
    const info = window.__trace
    const gl = document.querySelector('canvas')
    const W = gl.width, H = gl.height
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d'); ctx.drawImage(gl, 0, 0)
    const { data } = ctx.getImageData(0, 0, W, H)
    // binary mask from alpha
    const mask = new Uint8Array(W * H)
    let count = 0
    for (let i = 0; i < W * H; i++) if (data[i * 4 + 3] > 96) { mask[i] = 1; count++ }
    // crack-edge tracing: collect directed edges between filled/empty pixels, then chain them
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : mask[y * W + x])
    const next = new Map() // key "x,y" -> [ [x2,y2], ... ] outgoing edges
    const add = (x1, y1, x2, y2) => { const k = x1 + ',' + y1; (next.get(k) ?? next.set(k, []).get(k)).push([x2, y2]) }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!at(x, y)) continue
      // filled pixel: emit edges going clockwise around it where the neighbour is empty
      if (!at(x, y - 1)) add(x, y, x + 1, y)       // top
      if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1) // right
      if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1) // bottom
      if (!at(x - 1, y)) add(x, y + 1, x, y)       // left
    }
    const loops = []
    for (const [k, outs] of next) {
      while (outs.length) {
        const start = k.split(',').map(Number)
        const loop = [start]
        let cur = outs.pop()
        let guard = 0
        while (cur && (cur[0] !== start[0] || cur[1] !== start[1]) && guard++ < 5e6) {
          loop.push(cur)
          const o = next.get(cur[0] + ',' + cur[1])
          if (!o || !o.length) break
          // prefer continuing straight/turning consistently: take the last (any) edge
          cur = o.pop()
        }
        if (loop.length > 8) loops.push(loop)
      }
    }
    // Ramer–Douglas–Peucker
    const rdp = (pts, eps) => {
      if (pts.length < 3) return pts
      const [a, b] = [pts[0], pts[pts.length - 1]]
      let maxD = 0, idx = 0
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1
      for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / len; if (d > maxD) { maxD = d; idx = i } }
      if (maxD > eps) { const l = rdp(pts.slice(0, idx + 1), eps), r = rdp(pts.slice(idx), eps); return l.slice(0, -1).concat(r) }
      return [a, b]
    }
    // pixels → asset px: the canvas shows `extent` units across; info.width/height are px
    const extentPx = Math.max(info.width, info.height) * 1.08
    const s = extentPx / W
    const ox = (W - info.width / s) / 2, oy = (H - info.height / s) / 2
    const eps = 1.6
    // Closed loops: split at the point farthest from the start so RDP has two open runs.
    const simplifyLoop = (l) => {
      let far = 0, best = -1
      for (let i = 1; i < l.length; i++) { const d = (l[i][0] - l[0][0]) ** 2 + (l[i][1] - l[0][1]) ** 2; if (d > best) { best = d; far = i } }
      const a = rdp(l.slice(0, far + 1), eps)
      const b = rdp([...l.slice(far), l[0]], eps)
      return a.slice(0, -1).concat(b.slice(0, -1))
    }
    const paths = loops
      .map(simplifyLoop)
      .filter((l) => l.length > 4)
      .map((l) => l.map(([x, y]) => [((x - ox) * s).toFixed(1), ((y - oy) * s).toFixed(1)]))
      .map((l) => 'M' + l.map(([x, y]) => `${x} ${y}`).join('L') + 'Z')
    return { info, loops: paths.length, filled: count, d: paths.join(' ') }
  })
  const { info, d } = result
  const w = +info.width.toFixed(1), h = +info.height.toFixed(1)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e8eefc"/><stop offset=".45" stop-color="#eee4fb"/><stop offset=".75" stop-color="#dff7ef"/><stop offset="1" stop-color="#fbf0dc"/>
    </linearGradient>
  </defs>
  <path d="${d}" fill="url(#g)" fill-rule="evenodd" stroke="#ffffff" stroke-opacity=".85" stroke-width="1.2" stroke-linejoin="round"/>
</svg>
`
  await writeFile(path.join(outDir, `${asset}.svg`), svg)
  // Stroke-only twin for the vector/loading mode.
  const outline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <path d="${d}" fill="none" stroke="#ffffff" stroke-opacity=".9" stroke-width="1.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
</svg>
`
  await mkdir(path.join(outDir, 'outline'), { recursive: true })
  await writeFile(path.join(outDir, 'outline', `${asset}.svg`), outline)
  manifest[asset] = { width: w, height: h, originX: +info.originX.toFixed(1), originY: +info.originY.toFixed(1), file: `${asset}.svg` }
  console.log(asset, `${w}×${h}px`, 'filled', result.filled, 'loops', result.loops, 'bytes', svg.length)
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
await b.close()
