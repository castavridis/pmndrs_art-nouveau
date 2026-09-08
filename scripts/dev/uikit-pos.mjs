// Compares uikit element transforms with the DOM twin's screen position for the 'docs' item.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 } })
await p.goto('http://localhost:5173/?nav=3d'); await p.waitForSelector('[data-3d]', { timeout: 15000 }); await p.waitForTimeout(800)
const out = await p.evaluate(() => {
  const s = window.__nav3d; const cam = s.camera; const canvas = s.gl.domElement.getBoundingClientRect()
  const V = cam.position.constructor
  const project = (v) => { const q = v.clone().project(cam); return [Math.round(canvas.x + (q.x + 1) / 2 * canvas.width), Math.round(canvas.y + (1 - q.y) / 2 * canvas.height)] }
  const dom = document.querySelector('[data-id="docs"]').getBoundingClientRect()
  const res = { domCentre: [Math.round(dom.x + dom.width / 2), Math.round(dom.y + dom.height / 2)] }
  let found = null
  s.scene.traverse((o) => { if (!found && o.hoveredList && o.parentContainer && o.size && o.size.peek && o.size.peek() && o.size.peek()[0] > 30 && o.size.peek()[0] < 60) found = o })
  if (found) {
    const mw = new V().setFromMatrixPosition(found.matrixWorld)
    res.matrixWorld = project(mw)
    const gm = found.globalMatrix?.peek?.(); if (gm) res.globalMatrix = project(new V().setFromMatrixPosition(gm))
    const gpm = found.globalPanelMatrix?.peek?.(); if (gpm) res.globalPanelMatrix = project(new V().setFromMatrixPosition(gpm))
    res.size = found.size.peek(); res.relativeCenter = found.relativeCenter?.peek?.()
  }
  return res
})
console.log(JSON.stringify(out)); await b.close()
