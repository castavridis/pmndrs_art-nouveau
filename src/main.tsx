import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import { Home } from './Home'
import { Demo } from './Demo'
import { DevGallery } from './DevGallery'
import { DevStage } from './DevStage'
import { LogoCube } from './experiments/LogoCube'
import { CalloutPage } from './experiments/CalloutPage'
import { AnnouncementPage } from './experiments/AnnouncementPage'
import { DevIndex } from './experiments/DevIndex'
import { TracePage } from './experiments/TracePage'
import { FrankensteinPage } from './experiments/FrankensteinPage'
import { PalettePage } from './experiments/PalettePage'
import { AppShell } from './AppShell'

const root = document.getElementById('root')!
const path = window.location.pathname
// Every route is available in every build; the leva panels and the tuning writer stay dev-only.
const page = path.startsWith('/dev/demo') ? (
  <Demo />
) : path.startsWith('/dev/stage') ? (
  <DevStage />
) : path.startsWith('/dev/cube') ? (
  <LogoCube />
) : path.startsWith('/dev/callout') ? (
  <CalloutPage />
) : path.startsWith('/dev/announcement') ? (
  <AnnouncementPage />
) : path.startsWith('/dev/palette') ? (
  <PalettePage />
) : path.startsWith('/dev/trace') ? (
  <TracePage />
) : path.startsWith('/dev/x/') ? (
  <FrankensteinPage slug={path.split('/')[3] ?? ''} />
) : /^\/dev\/?$/.test(path) ? (
  <DevIndex />
) : path.startsWith('/dev/nav') ? (
  <DevGallery />
) : (
  <Home />
)
const app = (
  <StrictMode>
    <AppShell>{page}</AppShell>
  </StrictMode>
)
// Production `/` is prerendered (see scripts/prerender.mjs); other routes are served the
// empty app shell (dist/app.html) and render on the client. Hydrate only when the markup
// is the home page's, so a prerendered Home is never hydrated with another route's tree.
if (root.hasChildNodes() && (path === '/' || path === '/index.html')) hydrateRoot(root, app)
else {
  root.replaceChildren()
  createRoot(root).render(app)
}
