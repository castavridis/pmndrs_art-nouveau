import type { TierResult } from 'detect-gpu'

export type Enhancement =
  /** DOM nav only. */
  | { level: '2d'; reason: string }
  /** 3D without the EffectComposer. */
  | { level: '3d-lite'; tier: TierResult }
  /** Full 3D. */
  | { level: '3d'; tier: TierResult }

/**
 * Decide how far to enhance, once, on the client.
 * 2D when: SSR, no WebGL2, GPU tier 0, or prefers-reduced-motion.
 * Tier 1 → 3D without postprocessing. Tier ≥ 2 → everything.
 * detect-gpu@5: benchmark tables are served from /benchmarks (copied from the package in
 * scripts/copy-benchmarks.mjs) so no third-party request is made.
 */
export async function decideEnhancement(): Promise<Enhancement> {
  if (typeof window === 'undefined') return { level: '2d', reason: 'ssr' }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return { level: '2d', reason: 'reduced-motion' }
  if (!hasWebGL2()) return { level: '2d', reason: 'no-webgl2' }
  let tier: TierResult
  try {
    // detect-gpu@5 ships CommonJS; a dynamic import keeps it out of the SSR bundle and
    // off the critical path of the first paint.
    const { getGPUTier } = await import('detect-gpu')
    tier = await getGPUTier({ benchmarksURL: `${import.meta.env.BASE_URL}benchmarks` })
  } catch {
    return { level: '2d', reason: 'detect-gpu-failed' }
  }
  if (tier.type === 'WEBGL_UNSUPPORTED' || tier.type === 'BLOCKLISTED' || tier.tier === 0) {
    return { level: '2d', reason: `gpu-${tier.type.toLowerCase()}-tier${tier.tier}` }
  }
  return tier.tier >= 2 ? { level: '3d', tier } : { level: '3d-lite', tier }
}

function hasWebGL2() {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

/** Query-string override for testing: `?nav=2d|3d|3d-lite`. Dev and preview only. */
export function enhancementOverride(): Enhancement | null {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return null
  const v = new URLSearchParams(window.location.search).get('nav')
  if (v === '2d') return { level: '2d', reason: 'override' }
  if (v === '3d' || v === '3d-lite') return { level: v, tier: { tier: 3, type: 'FALLBACK' } }
  return null
}
