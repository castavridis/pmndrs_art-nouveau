// /dev/cube with (a) a fresh profile, (b) a dark nav tune in nav-tuning (must not affect the cube),
// (c) a stale cube-tuning lacking the sheen fields (must not go black).
import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/-Users-cstavridis-Git--pmndrs-3d-2d-nav/4b2d0955-5612-4774-9903-5972812a40bd/scratchpad'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 300)))
const brightness = () => p.evaluate(() => { const c = document.querySelector('canvas'); const gl = c.getContext('webgl2'); const px = new Uint8Array(4 * 64 * 64); gl.readPixels(c.width / 2 - 32, c.height / 2 - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, px); let s = 0; for (let i = 0; i < px.length; i += 4) s += px[i] + px[i + 1] + px[i + 2]; return Math.round(s / (px.length / 4 * 3)) })
const results = {}
await p.goto('http://localhost:5173/dev/cube'); await p.waitForSelector('canvas'); await p.waitForTimeout(3500)
results.fresh = await p.evaluate(() => ({ key: localStorage.getItem('cube-tuning') ? 'cube-tuning' : null, res: window.__navTuning.getState().glass.resolution }))
await p.evaluate(() => {
  localStorage.setItem('nav-tuning', JSON.stringify({ state: { glass: { background: '#000000' }, env: { intensity: 0, rotation: 0, background: '#000000' } }, version: 1 }))
  const s = JSON.parse(localStorage.getItem('cube-tuning')); const g = { ...s.state.glass }; delete g.sheenNoise; delete g.sheenNoiseScale; delete g.roughnessNoise; s.state.glass = g; localStorage.setItem('cube-tuning', JSON.stringify(s))
})
await p.reload(); await p.waitForSelector('canvas'); await p.waitForTimeout(3500)
results.stale = await p.evaluate(() => { const g = window.__navTuning.getState().glass; return { sheenNoise: g.sheenNoise, sheenNoiseScale: g.sheenNoiseScale, envIntensity: window.__navTuning.getState().env.intensity } })
await p.screenshot({ path: `${OUT}/cube-stale.png` })
console.log(JSON.stringify({ results, errors }))
await b.close()
