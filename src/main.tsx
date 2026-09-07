import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)
// Production HTML is prerendered (see scripts/prerender.mjs); dev is client-only.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
