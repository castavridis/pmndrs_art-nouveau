// Vector/loading states: nav ?nav=svg, callout/announcement early frames vs. after ready.
import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 }, deviceScaleFactor: 2 })
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
await p.goto('http://localhost:5173/?nav=svg'); await p.waitForTimeout(1200)
await p.locator('header').screenshot({ path: `${OUT}/nav-svg.png` })
const vectorAttr = await p.locator('[data-vector]').count()
// loading state: throttle so the 3D takes a while
const cdp = await p.context().newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 200, downloadThroughput: (800 * 1024) / 8, uploadThroughput: (800 * 1024) / 8 })
await p.goto('http://localhost:5173/?nav=3d'); await p.waitForTimeout(1500)
const loadingVector = await p.locator('[data-vector]').count()
await p.locator('header').screenshot({ path: `${OUT}/nav-loading.png` })
await p.waitForSelector('[data-3d]', { timeout: 90000 }); await p.waitForTimeout(1200)
const afterVector = await p.locator('[data-vector]').count()
await p.locator('header').screenshot({ path: `${OUT}/nav-after.png` })
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
await p.setViewportSize({ width: 1100, height: 900 })
await p.goto('http://localhost:5173/dev/announcement'); await p.waitForTimeout(300)
await p.screenshot({ path: `${OUT}/announcement-loading.png`, fullPage: true })
await p.waitForTimeout(4500); await p.screenshot({ path: `${OUT}/announcement-ready.png`, fullPage: true })
console.log(JSON.stringify({ vectorAttr, loadingVector, afterVector, errors }))
await b.close()
