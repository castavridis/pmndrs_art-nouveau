// Shared framing for the shots. Files starting with _ are not shots.

/**
 * The square reel's camera body: a square page, filmed at 2.25× so the
 * 2160 px footage is exactly twice the 1080 px output — close-ups stay sharp.
 */
export const SQUARE = { viewport: { width: 960, height: 960 }, scale: 2.25 } as const;

/** The shell's fixed theme toggle (on the /dev pages), for takes where it would be clutter. */
export const HIDE_TOGGLE = 'button[aria-label^="Theme:"] { display: none !important; }';

/**
 * Bento (front page, `/`) targets. Where a component's box matters (for the
 * camera), the selector is its outer box, not a label inside it. The DOM nav is
 * the 3D nav's twin — same boxes — so its items are the pointer's targets.
 */
export const BENTO = {
  nav: 'nav[aria-label="Main"]',
  item: (id: string) => `[data-id="${id}"]`,
  banner: 'div:has(> [aria-label="Dismiss announcement"])',
  dismiss: '[aria-label="Dismiss announcement"]',
  copy: 'button:has-text("Copy")',
  callout: '[class*="parallaxRoot"]',
  launcher: '[class*="launcher"]',
  disable: 'button:has-text("Theme Switcher")',
} as const;

/** The 3D layer is up: the nav has swapped its vector outlines for the canvas. */
export const READY_3D = '[data-3d]';

/**
 * How long a take lets the pointer travel before its action, so the edit can
 * hold wide while the viewer gets their bearings, then push in.
 */
export const APPROACH = 1.1;
