// Compares DOM anchor boxes with the 3D items' projected positions.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 } })
await p.goto('http://localhost:5173/?nav=3d'); await p.waitForSelector('[data-3d]', { timeout: 15000 }); await p.waitForTimeout(800)
const out = await p.evaluate(() => {
  const s = window.__nav3d; const cam = s.camera; const canvas = s.gl.domElement.getBoundingClientRect()
  const V = s.camera.position.constructor
  const rows = []
  for (const id of ['logo', 'docs', 'examples', 'blog', 'cmd']) {
    const el = document.querySelector(`[data-id="${id}"]`); const r = el.getBoundingClientRect()
    rows.push({ id, domCx: Math.round(r.x + r.width / 2), domCy: Math.round(r.y + r.height / 2), w: Math.round(r.width) })
  }
  // uikit text objects: find objects whose properties include text; fall back to name matching
  const items = []
  s.scene.traverse((o) => { if (o.isMesh === undefined && o.properties && o.properties.peek && typeof o.properties.peek().text === 'string') items.push(o) })
  const proj = items.map((o) => { const v = new V(); v.setFromMatrixPosition(o.matrixWorld); v.project(cam); return { text: o.properties.peek().text, x: Math.round(canvas.x + (v.x + 1) / 2 * canvas.width), y: Math.round(canvas.y + (1 - v.y) / 2 * canvas.height) } })
  return { rows, proj }
})
console.log(JSON.stringify(out))
await b.close()
