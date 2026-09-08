// Screenshots /dev/stage (orbitable full-viewport scene), optionally with lights.debug on.
import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
await p.goto('http://localhost:5173/dev/stage'); await p.waitForSelector('canvas'); await p.waitForTimeout(3000)
await p.screenshot({ path: `${OUT}/stage.png` })
await p.evaluate(() => window.__navTuning.getState().set('lights', { debug: true })); await p.waitForTimeout(500)
// orbit a little: drag on the canvas
await p.mouse.move(700, 450); await p.mouse.down(); await p.mouse.move(600, 380, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(600)
await p.screenshot({ path: `${OUT}/stage-debug.png` })
console.log(JSON.stringify({ errors }))
await b.close()
