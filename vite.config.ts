import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
