import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []; p.on('console', m => logs.push(m.text().slice(0, 120)))
await p.goto('http://localhost:5173/?nav=3d'); await p.waitForFunction(() => !!window.__navTuning); await p.waitForTimeout(1500)
await p.evaluate(() => window.__navTuning.getState().set('env', { intensity: 1.75 }))
const res = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'save to project'); const r = b.getBoundingClientRect(); b.click(); return { w: r.width, h: r.height, x: r.x, y: r.y } })
await p.waitForTimeout(1000)
const file = JSON.parse(await readFile('src/nav/Nav3D/tuning.saved.json', 'utf8'))
console.log(JSON.stringify({ buttonBox: res, savedEnv: file.env, logs: logs.filter((l) => l.includes('[nav]')) }))
await b.close()
