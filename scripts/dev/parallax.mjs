// Moves the pointer across the first callout and checks the DOM content/card transform and the 3D tilt respond.
import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 2 })
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
await p.goto('http://localhost:5173/dev/callout'); await p.waitForSelector('canvas'); await p.waitForTimeout(3000)
const card = p.locator('section').first().locator('h3').first()
const box = await p.locator('section').first().locator('> div').first().boundingBox()
const read = () => p.evaluate(() => { const c = document.querySelector('section h3').parentElement; const roots = window.__nav3dRoots ?? []; const g = roots[0]?.scene.children.find((o) => o.type === 'Group' && o.rotation.y !== 0 || o.rotation.x !== 0); return { content: c.style.transform, tilt: roots[0] ? roots[0].scene.children.filter((o) => o.type === 'Group').map((o) => [+o.rotation.x.toFixed(3), +o.rotation.y.toFixed(3), +o.position.x.toFixed(3)]) : null } })
await p.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2); await p.waitForTimeout(700)
const right = await read()
await p.screenshot({ path: `${OUT}/callout-parallax.png`, clip: { x: box.x - 60, y: box.y - 60, width: box.width + 120, height: box.height + 120 } })
await p.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.9); await p.waitForTimeout(700)
const left = await read()
await p.mouse.move(5, 5); await p.waitForTimeout(900)
const rest = await read()
console.log(JSON.stringify({ right, left, rest, errors }))
await b.close()
