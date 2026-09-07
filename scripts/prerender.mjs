// Bakes the server-rendered <App/> (which includes the 2D nav) into dist/index.html
// so the nav is present with JavaScript disabled and before hydration.
import { readFile, writeFile, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const { render } = await import(pathToFileURL(path.join(dist, 'server/entry-server.js')).href)
const html = await readFile(path.join(dist, 'index.html'), 'utf8')
const out = html.replace('<div id="root"></div>', `<div id="root">${render()}</div>`)
await writeFile(path.join(dist, 'index.html'), out)
await rm(path.join(dist, 'server'), { recursive: true, force: true })
console.log('prerendered dist/index.html')
