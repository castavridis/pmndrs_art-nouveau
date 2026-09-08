// fps, WebGL contexts and JS heap for the pages with several canvases.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal', '--enable-precise-memory-info'] })
for (const [name, url, w, h] of [['nav', 'http://localhost:5173/?nav=3d', 1440, 600], ['callout', 'http://localhost:5173/dev/callout', 1000, 1000], ['announcement', 'http://localhost:5173/dev/announcement', 1100, 700], ['cube', 'http://localhost:5173/dev/cube', 1400, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.goto(url); await p.waitForSelector('canvas'); await p.waitForTimeout(4000)
  const r = await p.evaluate(async () => {
    let f = 0; const t0 = performance.now(); await new Promise((res) => { const t = () => { f++; performance.now() - t0 < 3000 ? requestAnimationFrame(t) : res() }; requestAnimationFrame(t) })
    const roots = window.__nav3dRoots ?? []
    return { fps: Math.round(f / 3), canvases: document.querySelectorAll('canvas').length, drawCalls: roots.map((s) => s.gl.info.render.calls), triangles: roots.map((s) => s.gl.info.render.triangles), heapMB: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576) }
  })
  console.log(name, JSON.stringify(r))
  await p.close()
}
await b.close()
