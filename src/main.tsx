import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { DevGallery } from './DevGallery'
import { DevStage } from './DevStage'
import { LogoCube } from './experiments/LogoCube'
import { CalloutPage } from './experiments/CalloutPage'

const root = document.getElementById('root')!
const path = window.location.pathname
const page = !import.meta.env.DEV
  ? <App />
  : path.startsWith('/dev/stage')
    ? <DevStage />
    : path.startsWith('/dev/cube')
      ? <LogoCube />
      : path.startsWith('/dev/callout')
        ? <CalloutPage />
      : path.startsWith('/dev/nav')
        ? <DevGallery />
        : <App />
const app = <StrictMode>{page}</StrictMode>
// Production HTML is prerendered (see scripts/prerender.mjs); dev is client-only.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
