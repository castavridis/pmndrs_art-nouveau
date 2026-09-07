// Emulates prefers-reduced-motion and checks the store flag + that petals stop floating.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
const p = await b.newPage({ viewport: { width: 1440, height: 500 }, reducedMotion: 'reduce' })
await p.goto('http://localhost:5173/?3d'); await p.waitForSelector('canvas'); await p.waitForTimeout(2000)
const a = await p.evaluate(() => { const s = window.__nav3d; const petals = []; s.scene.traverse(o => { if (o.isMesh && o.geometry.attributes.position.count > 10000 && o.geometry.attributes.position.count < 20000) petals.push(o.getWorldPosition(new (o.position.constructor)()).toArray()) }); return { reduced: window.__navStore.getState().reducedMotion, petals } })
await p.waitForTimeout(600)
const b2 = await p.evaluate(() => { const s = window.__nav3d; const petals = []; s.scene.traverse(o => { if (o.isMesh && o.geometry.attributes.position.count > 10000 && o.geometry.attributes.position.count < 20000) petals.push(o.getWorldPosition(new (o.position.constructor)()).toArray()) }); return petals })
const moved = a.petals.some((pos, i) => pos.some((v, k) => Math.abs(v - b2[i][k]) > 1e-6))
console.log(JSON.stringify({ reduced: a.reduced, petalCount: a.petals.length, petalsMoved: moved }))
await b.close()
