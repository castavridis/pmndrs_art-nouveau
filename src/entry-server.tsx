import { renderToString } from 'react-dom/server'
import { Home } from './Home'
import { AppShell } from './AppShell'

/** Used by scripts/prerender.mjs to bake the 2D nav into dist/index.html (same tree as main.tsx). */
export function render() {
  return renderToString(
    <AppShell>
      <Home />
    </AppShell>,
  )
}
