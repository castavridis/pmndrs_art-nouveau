import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const presets = JSON.parse(process.argv[2])
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 })
await p.goto('http://localhost:5173/dev/cube'); await p.waitForFunction(() => !!window.__navTuning); await p.waitForTimeout(3500)
for (const [name, patch] of Object.entries(presets)) {
  await p.evaluate((patch) => { for (const [g, v] of Object.entries(patch)) window.__navTuning.getState().set(g, v) }, patch)
  await p.waitForTimeout(900)
  const fps = await p.evaluate(async () => { let f = 0; const t0 = performance.now(); await new Promise(r => { const t = () => { f++; performance.now() - t0 < 1000 ? requestAnimationFrame(t) : r() }; requestAnimationFrame(t) }); return f })
  await p.screenshot({ path: `${OUT}/cube-${name}.png`, clip: { x: 260, y: 20, width: 880, height: 600 } })
  console.log(name, 'fps', fps)
}
await b.close()
