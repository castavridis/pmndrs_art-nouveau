import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 }, deviceScaleFactor: 4 })
await p.goto('http://localhost:5173/?nav=3d'); await p.waitForSelector('[data-3d]', { timeout: 15000 }); await p.waitForTimeout(1200)
const box = (await p.locator('[data-id="cmd"]').boundingBox())
await p.screenshot({ path: `${OUT}/cmd-3d.png`, clip: { x: box.x - 20, y: box.y - 30, width: box.width + 60, height: box.height + 60 } })
await b.close()
