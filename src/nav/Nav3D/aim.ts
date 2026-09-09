/**
 * Where the current page's item sits (world x, canvas-centred), written each frame by the
 * nav (AimTracker in NavRoot) and read by lights that should point at it. Module-level so
 * the light, which lives outside the nav's item registry, can follow without a re-render.
 */
export const navAim = { x: 0, active: false }
