// Loads the built site (vite preview) with a GPU and prints the gate result plus any errors.
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
const server = spawn('pnpm', ['exec', 'vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1500))
try {
  const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 400 } })
  const errors = []; p.on('pageerror', e => errors.push((e.stack || e.message).split('\n').slice(0, 5).join('\n'))); p.on('console', m => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 300)))
  await p.goto('http://localhost:4173/')
  let is3D = false
  try { await p.waitForSelector('[data-3d]', { timeout: 15000 }); is3D = true } catch {}
  console.log(JSON.stringify({ is3D, enhancement: await p.getAttribute('[data-enhancement]', 'data-enhancement') }))
  console.log(errors.join('\n---\n'))
  await b.close()
} finally { server.kill() }
