import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 2 })
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
await p.goto('http://localhost:5173/dev/announcement'); await p.waitForSelector('canvas'); await p.waitForTimeout(4000)
await p.screenshot({ path: `${OUT}/announcement.png`, fullPage: true })
await p.goto('http://localhost:5173/dev/'); await p.waitForTimeout(500)
await p.screenshot({ path: `${OUT}/devindex.png` })
console.log(JSON.stringify({ errors, links: await p.locator('a').count() }))
await b.close()
