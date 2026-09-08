import { chromium } from '@playwright/test'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1000, height: 1000 } })
await p.goto('http://localhost:5173/dev/callout'); await p.waitForSelector('canvas'); await p.waitForTimeout(3000)
const m = () => p.evaluate(() => [...document.querySelectorAll('canvas')].map((c) => ({ attr: [c.width, c.height], css: [c.style.width, c.style.height], rect: [Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height)], parent: [Math.round(c.parentElement.getBoundingClientRect().width), Math.round(c.parentElement.getBoundingClientRect().height)], r3f: window.__nav3d ? [window.__nav3d.size.width, window.__nav3d.size.height] : null })))
const before = await m()
await p.setViewportSize({ width: 1001, height: 1000 }); await p.waitForTimeout(800)
const after = await m()
console.log(JSON.stringify({ before, after })); await b.close()
