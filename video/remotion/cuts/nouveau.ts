import type { Cut, Reel } from '../edit';

/**
 * Art Nouveau: the bento's flowers, outlines and glass, square and silent, ~24 s.
 *
 * Three long takes, each one unbroken shot under a camera that glides (1.5–2 s moves, no
 * punches, no shake, no click rings), joined by slow dips through the page's dark ground:
 *  1. nv-intro: the ground, the outlines drawing in, the glass dissolving up; the pointer
 *     drifts through the petals.
 *  2. nv-nav: the pill follows along the nav, the light runs round its rim, the banner's (×)
 *     chip follows the pointer, and the banner breaks in captured slow motion.
 *  3. nv-switch: the switch off and on, the light over the callout, then the page to light.
 *
 * Takes are filmed 864 px square so the column fills the frame to about 1.5rem, in the shipped
 * tuning (the "heavily distorted" theme, d026b50). `from` is seconds into the clip; camera `t`
 * is seconds into the cut, which is (clip time − from) / rate.
 * After the banner breaks the page reflows ~94 px up: nv-switch's column runs ~62–730 px, so
 * its wide frame is zoom 1.2 on y 396 to keep the same margin.
 */
const DARK = '#141410';
const LIGHT = '#eeede6';
const WIDE_AFTER_BREAK: [number, number] = [432, 396];

/** The calm defaults every shot shares. */
const calm = { punch: false, ring: false } satisfies Partial<Cut>;

export const nouveau: Reel = {
  // Silent: no music, no sound effects. The beat grid (0.5 s) only sets the shots' lengths.
  bpm: 120,
  sfx: false,
  vignette: false,
  cuts: [
    // 1. from the dark: the outlines draw in, the glass dissolves up (done by 3.9 s), then a
    //    slow drift in as the pointer moves through the petals
    {
      ...calm,
      clip: 'nv-intro',
      from: 0,
      beats: 13,
      fadeIn: { seconds: 0.9, color: '#000' },
      fadeOut: { seconds: 0.45, color: DARK },
      camera: [
        { t: 0, zoom: 1, focus: 'center' },
        { t: 3.9, zoom: 1.02, focus: 'center', ease: 'inOut' },
        { t: 6.5, zoom: 1.12, focus: [432, 330], ease: 'inOut' },
      ],
    },
    // 2. the nav and the banner, one unbroken shot (t = (clip − 0.6) / 1.2): the pill from
    //    t 0.4–1.9, the rim 2.1–4.6, the chip 5.3–6.9, the break at 7.2, slow motion to 8.7
    {
      ...calm,
      clip: 'nv-nav',
      from: 0.6,
      beats: 19,
      rate: 1.2,
      fadeIn: { seconds: 0.45, color: DARK },
      fadeOut: { seconds: 0.5, color: DARK },
      camera: [
        { t: 0, zoom: 1.05, focus: 'center' },
        { t: 1.6, zoom: 1.55, focus: 'mark:pill', ease: 'inOut' },
        { t: 4.4, zoom: 1.65, focus: 'mark:pill', ease: 'inOut' },
        { t: 5.9, zoom: 1.2, focus: 'mark:chip', ease: 'inOut' },
        { t: 7.2, zoom: 1.22, focus: 'mark:chip' },
        { t: 9.0, zoom: 1, focus: 'center', ease: 'inOut' },
      ],
    },
    // 3. the switch, the callout and the light, one unbroken shot (t = clip / 1.1): presses at
    //    t 1.1 and 2.1, the callout 3.4–5.6, the switch to light at 6.25, settled by 7.1
    {
      ...calm,
      clip: 'nv-switch',
      from: 0,
      beats: 17,
      rate: 1.1,
      fadeIn: { seconds: 0.45, color: DARK },
      fadeOut: { seconds: 0.9, color: LIGHT },
      camera: [
        { t: 0, zoom: 1.2, focus: WIDE_AFTER_BREAK },
        { t: 1.05, zoom: 1.8, focus: [432, 668], ease: 'inOut' },
        { t: 2.4, zoom: 1.8, focus: [432, 668] },
        { t: 3.5, zoom: 1.4, focus: 'mark:callout', ease: 'inOut' },
        { t: 5.3, zoom: 1.45, focus: 'mark:callout' },
        { t: 7.0, zoom: 1.17, focus: WIDE_AFTER_BREAK, ease: 'inOut' },
        { t: 8.5, zoom: 1.19, focus: WIDE_AFTER_BREAK },
      ],
    },
  ],
};
