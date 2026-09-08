import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev-only endpoint behind the leva panel's "save to project" button:
 * POST /__nav/tuning with a JSON body → src/nav/Nav3D/tuning.saved.json, which tuning.ts
 * merges over its defaults, so what you tuned is what ships.
 */
function navTuningWriter(): Plugin {
  const file = path.resolve('src/nav/Nav3D/tuning.saved.json')
  return {
    name: 'nav-tuning-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__nav/tuning', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let body = ''
        req.on('data', (c: Buffer) => (body += c))
        req.on('end', async () => {
          try {
            const json = JSON.parse(body)
            await writeFile(file, JSON.stringify(json, null, 2) + '\n')
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, file }))
          } catch (e) {
            res.statusCode = 400
            res.end(String(e))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), navTuningWriter()],
  resolve: { dedupe: ['three'] },
  base: './',
  assetsInclude: ['**/*.glb', '**/*.hdr'],
  build: {
    // @pmndrs/uikit@1.0.76 reads `constructor.name` (dist/components/component.js); with
    // mangled names it throws at runtime and the nav falls back to 2D. Vite 8's default
    // minifier (oxc) has no keep-names switch, so terser with kept names it is (+2% gzip).
    minify: 'terser',
    terserOptions: {
      mangle: { keep_classnames: true, keep_fnames: true },
      compress: { keep_classnames: true, keep_fnames: true },
    },
  },
})
