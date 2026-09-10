import { renderToString } from 'react-dom/server'
import { BentoPage } from './experiments/BentoPage'
import { AppShell } from './AppShell'

/**
 * Used by scripts/prerender.mjs to bake the front page into dist/index.html, so the nav and the
 * rest of the bento's DOM are there with JavaScript off and before hydration. Must be the same
 * tree main.tsx hydrates: the bento, with its own theme switch in place of the corner toggle.
 */
export function render() {
  return renderToString(
    <AppShell themeToggle={false}>
      <BentoPage />
    </AppShell>,
  )
}
