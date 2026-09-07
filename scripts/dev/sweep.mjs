import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const presets = JSON.parse(process.argv[2])
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 900, height: 400 }, deviceScaleFactor: 2 })
await p.goto('http://localhost:5173/?nav=3d'); await p.waitForSelector('canvas'); await p.waitForTimeout(1500)
for (const [name, patch] of Object.entries(presets)) {
  await p.evaluate((patch) => { for (const [g, v] of Object.entries(patch)) window.__navTuning.getState().set(g, v) }, patch)
  await p.waitForTimeout(700)
  await p.locator('header').screenshot({ path: `${OUT}/sweep-${name}.png` })
}
await b.close(); console.log('done', Object.keys(presets).join(','))
