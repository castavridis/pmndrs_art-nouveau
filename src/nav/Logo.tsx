import type { SVGProps } from 'react'

/**
 * pmndrs logo, inline so it renders with no network request and inherits `currentColor`.
 * Mirrors `assets/logo.svg`; keep the two in sync.
 */
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M12 2h18v13H12z" />
      <path d="M2 11h22v8H2z" />
      <path d="M18 14h8v16h-8z" />
    </svg>
  )
}
