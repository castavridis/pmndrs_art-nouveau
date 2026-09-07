// Prints console errors/warnings and page errors for /?3d.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 } })
p.on('console', (m) => m.type() !== 'debug' && m.type() !== 'info' && console.log(`[${m.type()}]`, m.text().slice(0, 600)))
p.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 800), '\n', (e.stack || '').split('\n').slice(0, 6).join('\n')))
await p.goto(process.argv[2] || 'http://localhost:5173/?nav=3d'); await p.waitForTimeout(3000)
console.log('canvas:', await p.evaluate(() => !!document.querySelector('canvas')))
await b.close()
