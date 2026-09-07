// Walk the viewport through the modes with the 3D preview on; screenshot each.
import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 }, deviceScaleFactor: 2 })
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()))
await p.goto('http://localhost:5173/?3d'); await p.waitForSelector('canvas'); await p.waitForTimeout(2000)
const out = []
for (const w of [1440, 768, 560, 420, 320]) {
  await p.setViewportSize({ width: w, height: 500 }); await p.waitForTimeout(700)
  const info = await p.evaluate(() => ({ mode: window.__navStore.getState().mode, scrollW: document.documentElement.scrollWidth, pillPx: (() => { const s = window.__nav3d; const m = s.scene.getObjectByProperty('type', 'Mesh'); m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox; return Math.round((bb.max.x - bb.min.x) * 100) })() }))
  await p.locator('section[aria-label="3D preview"]').screenshot({ path: `${OUT}/mode3d-${w}.png` })
  out.push({ w, ...info })
}
console.log(JSON.stringify({ out, errors }))
await b.close()
