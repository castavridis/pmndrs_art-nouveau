import { chromium } from '@playwright/test'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1000, height: 1000 } })
await p.goto('http://localhost:5173/dev/callout'); await p.waitForSelector('canvas'); await p.waitForTimeout(3000)
const out = await p.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] }
  const cards = [...document.querySelectorAll('section')].map((sec) => {
    const root = sec.querySelector('section > div')
    const canvasBox = root.querySelector(':scope > div[aria-hidden]')
    const canvas = canvasBox.querySelector('canvas')
    return { label: sec.getAttribute('aria-label'), root: r(root), canvasBox: r(canvasBox), canvas: r(canvas), canvasAttr: [canvas.width, canvas.height], r3fParent: r(canvas.parentElement), canvasBoxStyle: canvasBox.getAttribute('style') }
  })
  return cards
})
console.log(JSON.stringify(out, null, 1)); await b.close()
