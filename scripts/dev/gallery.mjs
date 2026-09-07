// Full-page screenshot of /dev/nav plus console errors and the mode of every cell.
import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1700, height: 1200 }, deviceScaleFactor: 1 })
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 160)))
await p.goto('http://localhost:5173/dev/nav'); await p.waitForTimeout(4000)
const cells = await p.evaluate(() => [...document.querySelectorAll('section')].map(s => s.getAttribute('aria-label') + ': ' + [...s.querySelectorAll('[data-mode]')].map(r => r.dataset.mode + (r.closest('[data-3d]') ? '(3D)' : '')).join(', ')))
await p.screenshot({ path: `${OUT}/gallery.png`, fullPage: true })
console.log(JSON.stringify({ cells, canvases: await p.locator('canvas').count(), errors }, null, 1))
await b.close()
