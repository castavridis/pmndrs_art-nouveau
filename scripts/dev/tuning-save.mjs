// Persisted tuning: set → reload → still set; "save to project" writes tuning.saved.json.
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const ctx = await b.newContext({ viewport: { width: 1440, height: 700 } })
const p = await ctx.newPage()
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 160)))
await p.goto('http://localhost:5173/?nav=3d'); await p.waitForFunction(() => !!window.__navTuning); await p.waitForTimeout(1500)
await p.evaluate(() => { window.__navTuning.getState().set('env', { intensity: 2.25 }); window.__navTuning.getState().set('lights', { luminanceScale: 0.9 }) })
await p.waitForTimeout(300)
const ls = await p.evaluate(() => JSON.parse(localStorage.getItem('nav-tuning') ?? 'null')?.state?.env?.intensity)
await p.reload(); await p.waitForFunction(() => !!window.__navTuning); await p.waitForTimeout(2500)
const after = await p.evaluate(() => ({ env: window.__navTuning.getState().env.intensity, lum: window.__navTuning.getState().lights.luminanceScale }))
// leva panel: expand and click "save to project"
await p.getByText('nav 3D').first().click().catch(() => {})
await p.waitForTimeout(300)
const btn = p.getByText('save to project').first()
await btn.scrollIntoViewIfNeeded().catch(() => {})
let clicked = false
try { await btn.click({ timeout: 3000 }); clicked = true } catch {}
await p.waitForTimeout(800)
const file = JSON.parse(await readFile('src/nav/Nav3D/tuning.saved.json', 'utf8'))
console.log(JSON.stringify({ localStorageIntensity: ls, afterReload: after, clicked, savedEnv: file.env, savedLum: file.lights?.luminanceScale, errors }))
await b.close()
