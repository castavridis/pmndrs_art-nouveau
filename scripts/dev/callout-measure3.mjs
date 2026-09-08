import { chromium } from '@playwright/test'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1000, height: 1000 } })
await p.goto('http://localhost:5173/dev/callout'); await p.waitForSelector('canvas'); await p.waitForTimeout(3000)
console.log(JSON.stringify(await p.evaluate(() => (window.__nav3dRoots ?? []).map((s) => ({ size: [s.size.width, s.size.height, s.size.left, s.size.top], canvasAttr: [s.gl.domElement.width, s.gl.domElement.height], container: [Math.round(s.gl.domElement.parentElement.getBoundingClientRect().width), Math.round(s.gl.domElement.parentElement.getBoundingClientRect().height)], sameGl: (window.__nav3dRoots ?? []).filter((o) => o.gl === s.gl).length })))))
await b.close()
