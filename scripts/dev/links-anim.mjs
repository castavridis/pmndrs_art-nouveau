// Drives the demo's "Links" slider 1 → 6 and captures frames of the pill opening.
import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 }, deviceScaleFactor: 1 })
const logs = []; p.on('console', m => (m.type() === 'warning' || m.type() === 'error') && logs.push(m.text())); p.on('pageerror', e => logs.push(e.message))
await p.goto('http://localhost:5173/?3d'); await p.waitForSelector('canvas'); await p.waitForTimeout(2000)
const setLinks = (n) => p.evaluate((n) => {
  const input = [...document.querySelectorAll('input[type=range]')][0]
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(input, String(n)); input.dispatchEvent(new Event('input', { bubbles: true }))
}, n)
const section = p.locator('section[aria-label="3D preview"]')
await setLinks(1); await p.waitForTimeout(800); await section.screenshot({ path: `${OUT}/anim-1.png` })
await setLinks(6)
for (const t of [60, 180, 400, 1000]) { await p.waitForTimeout(t === 60 ? 60 : t - [60,180,400,1000][[60,180,400,1000].indexOf(t)-1]); await section.screenshot({ path: `${OUT}/anim-6-${t}.png` }) }
const boxes = await p.evaluate(() => { const s = window.__nav3d; const b = new (s.scene.getObjectByProperty('type','Mesh').geometry.boundingBox?.constructor ?? Object)(); const mesh = s.scene.getObjectByProperty('type','Mesh'); mesh.geometry.computeBoundingBox(); const bb = mesh.geometry.boundingBox; return { pillWidthPx: Math.round((bb.max.x - bb.min.x) * 100), pillHeightPx: Math.round((bb.max.y - bb.min.y) * 100) } })
console.log(JSON.stringify({ boxes, logs })); await b.close()
