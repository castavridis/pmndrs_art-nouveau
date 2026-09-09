/** Components that get a traced SVG fallback (see TracePage and scripts/trace-svgs.mjs). */
export const TRACE_ASSETS = [
  'nav-left',
  'nav-right',
  'petal',
  'flower',
  'logo-cube',
  'callout-icon',
  'announcement-left',
  'announcement-right',
] as const
export type TraceAsset = (typeof TRACE_ASSETS)[number]
