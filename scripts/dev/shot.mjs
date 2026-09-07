import { chromium } from '@playwright/test'
const out = process.argv[2] || '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad/nav3d.png'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 }, deviceScaleFactor: 2 })
const logs = []
p.on('console', (m) => (m.type() === 'warning' || m.type() === 'error') && logs.push(`[${m.type()}] ${m.text()}`))
p.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await p.goto('http://localhost:5173/?3d')
await p.waitForSelector('canvas')
await p.waitForTimeout(3000)
const info = await p.evaluate(async () => {
  const c = document.querySelector('canvas')
  const gl = c.getContext('webgl2') || c.getContext('webgl')
  const dbg = gl?.getExtension('WEBGL_debug_renderer_info')
  const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a'
  let frames = 0
  const t0 = performance.now()
  await new Promise((r) => { const tick = () => { frames++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else r() }; requestAnimationFrame(tick) })
  return { renderer, fps: Math.round(frames / ((performance.now() - t0) / 1000)), size: [c.width, c.height] }
})
await p.locator('section[aria-label="3D preview"]').screenshot({ path: out })
console.log(JSON.stringify(info), '\nlogs:', logs.length ? '\n' + logs.join('\n') : 'none')
await b.close()
