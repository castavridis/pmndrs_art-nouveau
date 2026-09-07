// Keyboard focus (DOM anchors → store.focused) and pointer hover (uikit → store.hovered) on /?3d.
import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 }, deviceScaleFactor: 2 })
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()))
await p.goto('http://localhost:5173/?3d'); await p.waitForSelector('canvas'); await p.waitForTimeout(2500)
const focused = []
for (let i = 0; i < 5; i++) { await p.keyboard.press('Tab'); await p.waitForTimeout(50); focused.push(await p.evaluate(() => window.__navStore.getState().focused)) }
await p.waitForTimeout(300)
const section = p.locator('section[aria-label="3D preview"]'); const box = await section.boundingBox()
await section.screenshot({ path: `${OUT}/focus-cmd.png` })
// hover "Examples" (roughly 50% across the pill, vertical centre)
await p.mouse.move(box.x + box.width * 0.50, box.y + box.height * 0.5); await p.waitForTimeout(400)
const hovered = await p.evaluate(() => window.__navStore.getState().hovered)
await section.screenshot({ path: `${OUT}/hover.png` })
await p.mouse.move(0, 0); await p.waitForTimeout(200)
const unhovered = await p.evaluate(() => window.__navStore.getState().hovered)
// pointer click on the 3D "Blog" → DOM anchor click → navigation
const beforeUrl = p.url()
await p.mouse.click(box.x + box.width * 0.573, box.y + box.height * 0.5); await p.waitForTimeout(800)
console.log(JSON.stringify({ focused, hovered, unhovered, navigatedTo: p.url() !== beforeUrl ? p.url() : null, errors }))
await b.close()
