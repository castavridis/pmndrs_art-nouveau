// APCA (Lc) contrast of every piece of text on glass — the nav's labels, the announcement's and
// the callout's copy, the bento launcher — against the rendered backdrop, per theme, in the ink
// each one actually got (the measured one, see src/nav/Nav3D/contrast.ts). The text is taken out
// of the picture while the backdrop is sampled: the 3D labels through the camera's layer mask
// (the text layer off, the contrast aids kept, since the viewer sees them), the DOM copy by
// hiding it. So the numbers are for the actual pixels behind each piece of text (median and
// worst tenth), not a flat colour. It is the check on the in-canvas measurement, which models
// the composer's grading rather than reading the screen.
// Usage: dev server running, then `node scripts/dev/apca.mjs [url] [--hover=<item id>] [--settings=<file>]`,
// where the settings file is a JSON object of localStorage keys to start from (a panel session's
// tuning, presets and themes), so the check runs on the tuning being worked on, not the shipped one.
import { chromium } from '@playwright/test'
import { PNG } from 'pngjs'
import { APCAcontrast, sRGBtoY } from 'apca-w3'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const URL = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:5173/'
const HOVER = args.find((a) => a.startsWith('--hover='))?.slice(8)
const SETTINGS_FILE = args.find((a) => a.startsWith('--settings='))?.slice(11)
const SETTINGS = SETTINGS_FILE ? JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) : {}
/** Body-text guidance (APCA readability levels, fonts ~15–18px normal weight). */
const TARGET = { body: 75, min: 60 }
/** The text layer's bit (src/nav/Nav3D/layers.ts). */
const TEXT_LAYER = 1

const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
for (const theme of ['dark', 'light']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await ctx.addInitScript(
    ({ t, settings }) => {
      for (const [k, v] of Object.entries(settings)) if (typeof v === 'string') localStorage.setItem(k, v)
      localStorage.setItem('theme', JSON.stringify({ state: { theme: t }, version: 0 }))
    },
    { t: theme, settings: SETTINGS },
  )
  const p = await ctx.newPage()
  await p.goto(URL)
  await p.waitForSelector('[data-3d]', { timeout: 30000 })
  await p.waitForTimeout(3500)
  if (HOVER) {
    const box = await p.locator(`[data-id="${HOVER}"]`).first().boundingBox()
    if (box) await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  }
  // A few seconds of readings, so the measured inks have settled.
  await p.waitForTimeout(2500)

  const regions = await p.evaluate(async () => {
    const { INKS } = await import('/src/nav/Nav3D/dom.ts')
    const out = []
    const readings = window.__navStore?.getState().readings ?? {}
    // Nav labels: the DOM twins give the boxes (the 3D text is what's drawn); the middle of
    // each, where the glyphs are, as the in-canvas measurement takes it.
    for (const el of document.querySelectorAll('[data-id]')) {
      const id = el.dataset.id
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue // hidden in this mode (the collapsed Menu button)
      const w = r.width * (id === 'logo' ? 0.6 : 0.7)
      const h = r.height * (id === 'logo' ? 0.6 : 0.4)
      const reading = readings[id]
      out.push({
        name: `nav: ${id}`,
        rects: [{ x: r.x + (r.width - w) / 2, y: r.y + (r.height - h) / 2, w, h }],
        ink: reading ? INKS[reading.scheme].ink : null,
        veil: reading?.veil ?? 0,
      })
    }
    // DOM copy on glass: the line boxes of its text, in the colour it is set in.
    const lines = (root) => {
      const rects = []
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      const range = document.createRange()
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue
        range.selectNodeContents(n)
        for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) rects.push({ x: r.x, y: r.y, w: r.width, h: r.height })
      }
      return rects
    }
    // The banner's copy: found from its link, since the banner has no landmark of its own.
    const banner = [...document.querySelectorAll('a')].find((a) => a.textContent.includes('Read more'))?.closest('[class*="content"]')
    const dom = [
      ['announcement', banner],
      ['callout', document.querySelector('[class*="parallaxRoot"] [class*="content"]')],
      ['launcher', document.querySelector('[class*="launcher"]')],
    ]
    for (const [name, el] of dom) {
      if (!el) continue
      // The body copy's colour: the printed banner's DOM copy is transparent, and its print
      // is drawn in the banner's ink snapped to pure white or near-black.
      const target = el.querySelector('p, span, strong') ?? el
      let color = getComputedStyle(target).color
      if (/rgba\([^)]*,\s*0\)/.test(color)) {
        const root = getComputedStyle(el.parentElement).color.match(/\d+/g).slice(0, 3).map(Number)
        color = root.reduce((a, c) => a + c, 0) / 3 > 128 ? 'rgb(255, 255, 255)' : 'rgb(10, 10, 10)'
      }
      out.push({ name, rects: lines(el), color, hide: true })
    }
    return out
  })

  // Take the text out: the text layer off every scene's camera, the DOM copy hidden.
  await p.evaluate((bit) => {
    for (const r of window.__nav3dRoots ?? []) r.camera.layers.disable(bit)
    const banner = [...document.querySelectorAll('a')].find((a) => a.textContent.includes('Read more'))?.closest('[class*="content"]')
    for (const el of [banner, ...document.querySelectorAll('[class*="parallaxRoot"] [class*="content"], [class*="launcher"]')])
      if (el) el.style.visibility = 'hidden'
  }, TEXT_LAYER)
  await p.waitForTimeout(400)
  const png = PNG.sync.read(await p.screenshot())

  const rows = []
  for (const r of regions) {
    if (!r.ink && !r.color) {
      rows.push({ region: r.name, ink: "(not measured yet)" })
      continue
    }
    const ink = r.ink ? hex(r.ink) : rgbFromCss(r.color)
    const yText = sRGBtoY(ink)
    const ys = []
    for (const q of r.rects)
      for (let y = Math.max(0, Math.round(q.y)); y < Math.min(png.height, q.y + q.h); y++)
        for (let x = Math.max(0, Math.round(q.x)); x < Math.min(png.width, q.x + q.w); x++) {
          const i = (y * png.width + x) * 4
          ys.push(sRGBtoY([png.data[i], png.data[i + 1], png.data[i + 2]]))
        }
    if (!ys.length) continue
    ys.sort((a, c) => a - c)
    const q = (f) => ys[Math.min(ys.length - 1, Math.floor(f * ys.length))]
    const lc = (yBg) => Math.abs(APCAcontrast(yText, yBg))
    // Worst case: the 10% of backdrop closest in lightness to the text.
    const worst = yText > q(0.5) ? lc(q(0.9)) : lc(q(0.1))
    rows.push({
      region: r.name,
      ink: r.ink ?? r.color,
      veil: r.veil ? r.veil.toFixed(2) : '',
      median: Math.round(lc(q(0.5))),
      worst: Math.round(worst),
      verdict: worst >= TARGET.body ? 'ok' : worst >= TARGET.min ? 'borderline' : 'FAIL',
    })
  }
  console.log(`\n${theme} theme${HOVER ? ` (hovering ${HOVER})` : ''} — APCA Lc, body target ≥ ${TARGET.body}, minimum ${TARGET.min}`)
  console.table(rows)
  await ctx.close()
}
await b.close()

function hex(h) {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
}
function rgbFromCss(s) {
  const m = s.match(/\d+/g)
  return m ? m.slice(0, 3).map(Number) : [17, 17, 17]
}
