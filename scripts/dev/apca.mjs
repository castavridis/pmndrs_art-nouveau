// APCA (Lc) contrast of the nav labels and the announcement text against the rendered
// backdrop, per theme. The text is hidden while the backdrop is sampled, so the numbers are
// for the actual pixels behind each label (median and worst case), not a flat colour.
// Usage: dev server on :5173, then `node scripts/dev/apca.mjs [url]`.
import { chromium } from '@playwright/test'
import { PNG } from 'pngjs'
import { APCAcontrast, sRGBtoY } from 'apca-w3'

const URL = process.argv[2] ?? 'http://localhost:5173/'
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
/** Body-text guidance (APCA readability levels, fonts ~15–18px normal weight). */
const TARGET = { body: 75, min: 60 }

const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
for (const theme of ['dark', 'light']) {
  const p = await b.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 1 })
  await p.goto(URL)
  await p.evaluate((t) => localStorage.setItem('theme', JSON.stringify({ state: { theme: t }, version: 0 })), theme)
  await p.reload()
  await p.waitForSelector('[data-3d]', { timeout: 30000 })
  await p.waitForTimeout(3500)

  // Regions to test: the nav items (DOM twins give the boxes; the 3D text is what's drawn)
  // and the announcement text.
  const navInk = await p.evaluate(async () => {
    const m = await import('/src/nav/Nav3D/dom.ts')
    const t = window.__navTuning.getState()
    // mirror useInk: glass backdrop lightness decides, theme in between
    const hex = t.glass.background
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    const theme = document.documentElement.dataset.theme
    return m.INKS[y < 0.25 ? 'dark' : y > 0.5 ? 'light' : theme].ink
  })
  const regions = await p.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('[data-id]')) {
      if (el.dataset.id === 'logo') continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue // hidden in this mode (e.g. the collapsed Menu button)
      out.push({ name: `nav: ${el.dataset.id}`, x: r.x, y: r.y, w: r.width, h: r.height, kind: 'nav' })
    }
    const a = document.querySelector('section[aria-label=Announcement] strong')
    if (a) {
      const r = a.parentElement.getBoundingClientRect()
      out.push({ name: 'announcement', x: r.x, y: r.y, w: r.width, h: r.height, kind: 'announcement', color: getComputedStyle(a).color })
    }
    return out
  })

  // Hide the text: the 3D label group (the one at the pill's face depth) and the DOM content.
  await p.evaluate(() => {
    const st = window.__nav3d
    // Hide the label layer but keep the scrim (it is part of the backdrop the text sits on).
    st?.scene.traverse((o) => {
      if (o.type === 'Group' && Math.abs(o.position.z - 0.034) < 1e-3) for (const c of o.children) if (c.name !== 'label-scrim') c.visible = false
    })
    for (const c of document.querySelectorAll('section[aria-label=Announcement] [class*="content"]')) c.style.visibility = 'hidden'
  })
  await p.waitForTimeout(400)
  const png = PNG.sync.read(await p.screenshot())

  const rows = []
  for (const r of regions) {
    const ink = r.kind === 'nav' ? navInk : rgbFromCss(r.color)
    const yText = sRGBtoY(typeof ink === 'string' ? hex(ink) : ink)
    const ys = []
    for (let y = Math.round(r.y); y < r.y + r.h; y++)
      for (let x = Math.round(r.x); x < r.x + r.w; x++) {
        const i = (y * png.width + x) * 4
        ys.push(sRGBtoY([png.data[i], png.data[i + 1], png.data[i + 2]]))
      }
    ys.sort((a, b) => a - b)
    const q = (f) => ys[Math.min(ys.length - 1, Math.floor(f * ys.length))]
    const lc = (yBg) => Math.abs(APCAcontrast(yText, yBg))
    // Worst case: the 10% of backdrop closest in lightness to the text.
    const worst = yText > q(0.5) ? lc(q(0.9)) : lc(q(0.1))
    rows.push({ region: r.name, median: Math.round(lc(q(0.5))), worst: Math.round(worst), verdict: worst >= TARGET.body ? 'ok' : worst >= TARGET.min ? 'borderline' : 'FAIL' })
  }
  console.log(`\n${theme} theme (nav ink ${navInk}) — APCA Lc, body target ≥ ${TARGET.body}, minimum ${TARGET.min}`)
  console.table(rows)
  await p.close()
}
await b.close()

function rgbFromCss(s) {
  const m = s.match(/\d+/g)
  return m ? m.slice(0, 3).map(Number) : [17, 17, 17]
}
