import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 }, deviceScaleFactor: 4 })
await p.goto('http://localhost:5173/?3d'); await p.waitForSelector('canvas'); await p.waitForTimeout(2500)
const box = await p.locator('section[aria-label="3D preview"]').boundingBox()
// logo sits ~ 35% across the section, vertically centred
await p.screenshot({ path: `${OUT}/logo-3d.png`, clip: { x: box.x + box.width * 0.29, y: box.y + box.height * 0.25, width: box.width * 0.14, height: box.height * 0.5 } })
await b.close()
