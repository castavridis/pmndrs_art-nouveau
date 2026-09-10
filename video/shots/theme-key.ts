import { defineShot } from '../capture/director';
import { BENTO, READY_3D, SQUARE } from './_common';

// The bento, then `T`: the page and the whole scene ease from dark to light.
export default defineShot({
  path: '/',
  ready: READY_3D,
  ...SQUARE,
  warmup: 2,
  script: async (d) => {
    await d.moveTo(BENTO.nav, { duration: 1.1 });
    await d.wait(0.6);
    await d.mark('switch', BENTO.nav);
    await d.key('t');
    await d.wait(2.4);
  },
});
