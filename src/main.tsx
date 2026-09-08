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
import { ThemeApplier } from './theme'
import { ThemeToggle } from './ThemeToggle'

const root = document.getElementById('root')!
const path = window.location.pathname
const page = !import.meta.env.DEV ? (
  <Home />
) : path.startsWith('/dev/demo') ? (
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
    <ThemeApplier />
    {page}
    {/* Light / dark / system, top-left on every page (the leva panel owns the top-right).
        After the page in DOM order so the nav keeps the first Tab stop. */}
    <ThemeToggle style={{ position: 'fixed', top: 16, left: 16, zIndex: 20 }} />
  </StrictMode>
)
// Production HTML is prerendered (see scripts/prerender.mjs); dev is client-only.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
