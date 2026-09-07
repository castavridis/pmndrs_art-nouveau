import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { DevGallery } from './DevGallery'

const root = document.getElementById('root')!
const isGallery = import.meta.env.DEV && window.location.pathname.startsWith('/dev/nav')
const app = <StrictMode>{isGallery ? <DevGallery /> : <App />}</StrictMode>
// Production HTML is prerendered (see scripts/prerender.mjs); dev is client-only.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
