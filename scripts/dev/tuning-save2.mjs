import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5173/?nav=3d'); await p.waitForFunction(() => !!window.__navTuning); await p.waitForTimeout(1500)
// expand leva: its title bar is a div with the title text; click it
const title = p.locator('div', { hasText: /^nav 3D$/ }).last()
await title.click({ timeout: 3000 }).catch((e) => console.log('title click failed', e.message.slice(0, 80)))
await p.waitForTimeout(400)
const buttons = await p.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter(Boolean))
const save = p.getByRole('button', { name: 'save to project' })
let clicked = false
try { await save.scrollIntoViewIfNeeded(); await save.click({ timeout: 3000 }); clicked = true } catch (e) { console.log('save click failed', e.message.slice(0, 100)) }
await p.waitForTimeout(800)
const file = JSON.parse(await readFile('src/nav/Nav3D/tuning.saved.json', 'utf8'))
await p.screenshot({ path: '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad/leva.png', clip: { x: 1040, y: 0, width: 400, height: 900 } })
console.log(JSON.stringify({ buttons, clicked, savedKeys: Object.keys(file) }))
await b.close()
