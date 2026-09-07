// Measures the required container width per mode for each link count on /dev/nav.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: 2400, height: 1200 } })
await p.goto('http://localhost:5173/dev/nav'); await p.waitForTimeout(2500)
const out = await p.evaluate(() => {
  const res = {}
  for (const sec of document.querySelectorAll('section')) {
    const label = sec.getAttribute('aria-label'); if (!label.includes('2D')) continue
    const cell = sec.querySelector('[data-mode]').parentElement.parentElement // Nav root div's cell wrapper
    const prevW = cell.style.width; cell.style.width = '2200px'
    const root = sec.querySelector('[data-mode]'); const pill = root.querySelector('nav > div')
    const cur = root.dataset.mode; root.dataset.probing = ''
    const req = {}
    for (const m of ['full', 'compact', 'collapsed']) { root.dataset.mode = m; req[m] = pill.scrollWidth + 112 }
    root.dataset.mode = cur; delete root.dataset.probing; cell.style.width = prevW
    res[label.split(' ')[0]] = req
  }
  return res
})
console.log(JSON.stringify(out))
await b.close()
