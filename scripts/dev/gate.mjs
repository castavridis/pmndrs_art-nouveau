// Runs the real gate (no override) with and without a GPU and reports what Nav decided.
import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
async function run(name, args) {
  const b = await chromium.launch({ channel: 'chrome', args })
  const p = await b.newPage({ viewport: { width: 1440, height: 400 }, deviceScaleFactor: 2 })
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
  const t0 = Date.now()
  await p.goto('http://localhost:5173/')
  const navVisible = await p.locator('nav[aria-label=Main]').isVisible()
  const tNav = Date.now() - t0
  await p.waitForFunction(() => document.querySelector('[data-enhancement]'), null, { timeout: 15000 })
  const level = await p.getAttribute('[data-enhancement]', 'data-enhancement')
  let is3D = false
  try { await p.waitForSelector('[data-3d]', { timeout: 8000 }); is3D = true } catch {}
  await p.waitForTimeout(900)
  const layout = await p.evaluate(() => { const r = document.querySelector('nav[aria-label=Main]').getBoundingClientRect(); return { navBox: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], canvas: !!document.querySelector('canvas'), enhancement: document.querySelector('[data-enhancement]').dataset.enhancement } })
  await p.locator('header').screenshot({ path: `${OUT}/gate-${name}.png` })
  console.log(name, JSON.stringify({ navVisible, tNavMs: tNav, level, is3D, ...layout, errors }))
  await b.close()
}
await run('gpu', ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'])
await run('nogpu', ['--disable-gpu', '--disable-gpu-compositing', '--disable-software-rasterizer', '--disable-webgl'])
