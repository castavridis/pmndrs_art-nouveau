import { renderToString } from 'react-dom/server'
import { App } from './App'

/** Used by scripts/prerender.mjs to bake the 2D nav into dist/index.html. */
export function render() {
  return renderToString(<App />)
}
