import { chromium } from '@playwright/test'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 600 } })
await p.goto('http://localhost:5173/?nav=3d'); await p.waitForSelector('[data-3d]', { timeout: 15000 }); await p.waitForTimeout(800)
const info = await p.evaluate(() => {
  const s = window.__nav3d; const cam = s.camera; const canvas = s.gl.domElement.getBoundingClientRect()
  const V = cam.position.constructor
  const out = {}
  for (const id of ['docs', 'examples', 'blog', 'cmd']) {
    const r = document.querySelector(`[data-id="${id}"]`).getBoundingClientRect()
    out[id] = { dom: [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)] }
  }
  const items = []
  s.scene.traverse((o) => { if (o.hoveredList && o.relativeCenter && o.size?.peek?.() && o.parentContainer?.peek?.()) items.push(o) })
  out.uikit = items.map((o) => { const rc = o.relativeCenter.peek(); const w = o.matrixWorld; const v = new V(rc[0] / 100, rc[1] / 100, 0.034).project(cam); return { size: o.size.peek().map(Math.round), screen: [Math.round(canvas.x + (v.x + 1) / 2 * canvas.width), Math.round(canvas.y + (1 - v.y) / 2 * canvas.height)] } })
  return out
})
const res = { info, hovered: [] }
for (const [x, y] of [info.blog.dom, info.examples.dom, [info.blog.dom[0] + 6, info.blog.dom[1]]]) {
  await p.mouse.move(x, y); await p.waitForTimeout(300)
  res.hovered.push([x, y, await p.evaluate(() => window.__navStore.getState().hovered)])
}
console.log(JSON.stringify(res)); await b.close()
