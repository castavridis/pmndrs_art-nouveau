import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
await p.goto('http://localhost:5173/dev/cube'); await p.waitForSelector('canvas'); await p.waitForTimeout(4500)
const info = await p.evaluate(async () => { let f = 0; const t0 = performance.now(); await new Promise(r => { const t = () => { f++; performance.now() - t0 < 3000 ? requestAnimationFrame(t) : r() }; requestAnimationFrame(t) }); const g = window.__navTuning.getState().glass; return { fps: Math.round(f / 3), resolution: g.resolution, thickness: g.thickness } })
await p.screenshot({ path: `${OUT}/cube.png` })
await p.screenshot({ path: `${OUT}/cube-crop.png`, clip: { x: 260, y: 20, width: 880, height: 600 } })
console.log(JSON.stringify({ ...info, errors }))
await b.close()
