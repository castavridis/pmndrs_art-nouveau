import { chromium, devices } from '@playwright/test'
const OUT = process.argv[2]
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 })
const p = await ctx.newPage()
await p.goto('http://localhost:5173/?nav=3d'); await p.waitForTimeout(7000)
const box = await p.locator('[data-id="menu"]').first().boundingBox()
await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(700)
console.log('menu', JSON.stringify(await p.evaluate(() => ({ open: document.querySelector('[data-open]')?.getAttribute('data-open'), links: [...document.querySelectorAll('[data-open="true"] a')].map(a => a.textContent) }))))
await p.screenshot({ path: `${OUT}/mobile-menu.png`, clip: { x: 0, y: 0, width: 390, height: 360 } })
// tap a link inside the open menu navigates
const docs = await p.locator('[data-open="true"] a').first().boundingBox()
if (docs) { await p.touchscreen.tap(docs.x + 10, docs.y + docs.height / 2); await p.waitForTimeout(800); console.log('after link tap', p.url()) }
await ctx.close()
const d = await b.newPage({ viewport: { width: 1200, height: 700 } }); await d.goto('http://localhost:5173/'); await d.waitForTimeout(6000)
console.log('desktop banner', JSON.stringify(await d.evaluate(() => { const r = document.querySelector('section[aria-label=Announcement] > *').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] })))
await d.screenshot({ path: `${OUT}/desktop-home.png`, clip: { x: 100, y: 0, width: 1000, height: 420 } })
await b.close()
