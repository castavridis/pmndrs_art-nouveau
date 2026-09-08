// Simulates the leaked v1 state (clearCube in nav-tuning) and checks the nav recovers.
import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 } })
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
await p.goto('about:blank')
await p.goto('http://localhost:5173/?nav=3d'); await p.waitForFunction(() => !!window.__navTuning)
await p.evaluate(() => {
  const g = window.__navTuning.getState().glass
  localStorage.setItem('nav-tuning', JSON.stringify({ state: { glass: { ...g, background: '#000000', envMapIntensity: 0.3, roughness: 0 }, env: { intensity: 0, rotation: 0, background: '#000000' } }, version: 1 }))
})
await p.reload(); await p.waitForFunction(() => !!window.__navTuning); await p.waitForSelector('[data-3d]', { timeout: 15000 }); await p.waitForTimeout(1500)
const st = await p.evaluate(() => { const s = window.__navTuning.getState(); const ls = JSON.parse(localStorage.getItem('nav-tuning')); return { background: s.glass.background, envIntensity: s.env.intensity, storedVersion: ls.version } })
await p.locator('header').screenshot({ path: `${OUT}/nav-migrated.png` })
console.log(JSON.stringify({ st, errors }))
await b.close()
