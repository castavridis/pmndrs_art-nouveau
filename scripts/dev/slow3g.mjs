// Serves dist/ and loads it under a Slow-3G-like throttle: DOM nav must show within 1s,
// 3D must arrive later with no errors and no layout shift of the nav box.
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
const server = spawn('pnpm', ['exec', 'vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1500))
try {
  const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 400 } })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 })
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
  const t0 = Date.now()
  await p.goto('http://localhost:4173/', { waitUntil: 'commit' })
  await p.waitForSelector('nav[aria-label=Main]', { state: 'visible' })
  const tNav = Date.now() - t0
  const box0 = await p.evaluate(() => { const r = document.querySelector('nav[aria-label=Main]').getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] })
  const hydrated = Date.now() - t0
  let t3D = null
  try { await p.waitForSelector('[data-3d]', { timeout: 90000 }); t3D = Date.now() - t0 } catch {}
  const decided = await p.evaluate(() => ({ enhancement: document.querySelector('[data-enhancement]')?.dataset.enhancement ?? null, canvas: !!document.querySelector('canvas'), transferred: performance.getEntriesByType('resource').map(r => [r.name.split('/').pop().slice(0, 40), Math.round(r.transferSize / 1024) + 'k', Math.round(r.responseEnd) + 'ms']) }))
  console.log(JSON.stringify(decided))
  const box1 = await p.evaluate(() => { const n = document.querySelector('nav[aria-label=Main]'); if (!n) return null; const r = n.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] })
  if (!box1) console.log('BODY:', (await p.evaluate(() => document.body.innerHTML.slice(0, 400))))
  const cls = await p.evaluate(() => new Promise((res) => { let sum = 0; const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) sum += e.value }); po.observe({ type: 'layout-shift', buffered: true }); setTimeout(() => res(sum), 200) }))
  console.log(JSON.stringify({ tNavMs: tNav, t3DMs: t3D, hydratedByMs: hydrated, navBoxBefore: box0, navBoxAfter: box1, cls, errors }))
  await b.close()
} finally { server.kill() }
