import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
await p.goto('http://localhost:5173/dev/cube'); await p.waitForSelector('canvas'); await p.waitForTimeout(4000)
const info = await p.evaluate(async () => { const s = window.__nav3d; let f = 0; const t0 = performance.now(); await new Promise(r => { const t = () => { f++; performance.now() - t0 < 2000 ? requestAnimationFrame(t) : r() }; requestAnimationFrame(t) }); const meshes = []; s.scene.traverse(o => { if (o.isMesh) meshes.push(o.geometry.attributes.position.count) }); return { fps: Math.round(f / 2), meshes: meshes.length } })
await p.screenshot({ path: `${OUT}/cube.png` })
console.log(JSON.stringify({ ...info, errors }))
await b.close()
