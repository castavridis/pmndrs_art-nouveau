import { defineShot } from '../capture/director';
import { BENTO, READY_3D } from './_common';
import { NV, NV_CSS, NV_LOOK, checkLook } from './_nouveau';

/**
 * After the banner has gone (broken off camera, where nv-nav left it): down to the theme switch.
 * Disable it — its glass goes dark and inert — and enable it again. Over the callout, which tilts
 * after the pointer to show its depth, then the switch itself: the page eases to light.
 */
export default defineShot({
  path: '/',
  ready: READY_3D,
  ...NV,
  warmup: 2,
  css: NV_CSS,
  storage: NV_LOOK,
  setup: async (d) => {
    await checkLook(d);
    // the banner breaks where nv-nav broke it, and its pieces finish falling
    await d.click({ selector: BENTO.banner, anchor: [0.16, 0.6] }, { move: 0.3 });
    await d.skip(4);
  },
  script: async (d) => {
    // 1. down to the switch, off, and on again
    await d.moveTo(BENTO.disable, { duration: 1.1, ease: 'inOut' });
    await d.mark('switch', BENTO.launcher);
    await d.click(BENTO.disable, { move: 0.1 });
    await d.wait(0.9);
    await d.mark('enable', BENTO.launcher);
    await d.click(BENTO.disable, { move: 0.1 });
    await d.wait(0.7);
    // 2. over the callout: it tilts after the pointer
    await d.moveTo({ selector: BENTO.callout, anchor: [0.25, 0.7] }, { duration: 0.7, ease: 'inOut' });
    await d.mark('callout', BENTO.callout);
    await d.trace(
      [
        { selector: BENTO.callout, anchor: [0.12, 0.2] },
        { selector: BENTO.callout, anchor: [0.55, 0.12] },
        { selector: BENTO.callout, anchor: [0.9, 0.3] },
        { selector: BENTO.callout, anchor: [0.8, 0.88] },
        { selector: BENTO.callout, anchor: [0.4, 0.8] },
      ],
      { duration: 2.4 }
    );
    // 3. the switch: to light
    await d.moveTo(BENTO.launcher, { duration: 0.6, ease: 'inOut' });
    await d.mark('light', BENTO.launcher);
    await d.click(BENTO.launcher, { move: 0.1 });
    await d.wait(2.4);
    await d.mark('end');
  },
});
