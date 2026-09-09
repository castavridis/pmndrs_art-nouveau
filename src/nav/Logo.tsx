import type { SVGProps } from 'react'
import { logoPaths, logoViewBox } from './logoSvg'

/**
 * pmndrs logo, inline so it renders with no network request and inherits `currentColor`.
 * Geometry comes from `assets/logo.svg` (see logoSvg.ts), the same file the 3D pill draws.
 */
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={logoViewBox}
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {logoPaths.map((p, i) => (
        <path key={i} d={p.d} fillRule={p.fillRule} clipRule={p.fillRule} />
      ))}
    </svg>
  )
}
