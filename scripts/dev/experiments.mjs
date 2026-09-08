import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const results = {}
for (const slug of ['bouquet', 'wreath', 'garland', 'totem', 'chimera']) {
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } })
  const errors = []; p.on('pageerror', e => errors.push(e.message.slice(0, 160))); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 160)))
  await p.goto(`http://localhost:5173/dev/x/${slug}`); await p.waitForSelector('canvas', { state: 'attached', timeout: 60000 }); await p.waitForTimeout(4500)
  const fps = await p.evaluate(async () => { let f = 0; const t0 = performance.now(); await new Promise((r) => { const t = () => { f++; performance.now() - t0 < 2000 ? requestAnimationFrame(t) : r() }; requestAnimationFrame(t) }); return Math.round(f / 2) })
  await p.screenshot({ path: `${OUT}/x-${slug}.png` })
  results[slug] = { fps, errors }
  await p.close()
}
const p = await b.newPage({ viewport: { width: 1200, height: 1100 } })
const errors = []; p.on('pageerror', e => errors.push(e.message.slice(0, 160))); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 160)))
await p.goto('http://localhost:5173/'); await p.waitForTimeout(5000)
await p.screenshot({ path: `${OUT}/home.png`, fullPage: true })
results.home = { errors }
console.log(JSON.stringify(results))
await b.close()
