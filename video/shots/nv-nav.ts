import { defineShot } from '../capture/director';
import { APPROACH, BENTO, READY_3D } from './_common';
import { NV, NV_CSS, NV_LOOK, PILL, checkLook } from './_nouveau';

/**
 * The nav and the banner. The pointer glides along the nav left to right with the pill growing
 * after it, then rides round the pill's rim so the light runs along the glass edges. Up into the
 * banner: its (×) chip leaves its corner and follows the pointer across the glass. A click
 * breaks the banner, in slow motion, and the pieces fall away.
 */
export default defineShot({
  path: '/',
  ready: READY_3D,
  ...NV,
  warmup: 2,
  css: NV_CSS,
  storage: NV_LOOK,
  cursorStart: { x: 120, y: 900 },
  setup: checkLook,
  script: async (d) => {
    // 1. along the nav, left to right: the pill follows
    await d.moveTo(BENTO.item('docs'), { duration: APPROACH, ease: 'inOut' });
    await d.mark('pill', PILL);
    await d.trace([BENTO.item('examples'), BENTO.item('blog'), BENTO.item('cmd')], {
      duration: 1.8,
    });
    await d.wait(0.2);
    // 2. round the rim: out past the right cap, back along the top edge, round the left cap
    //    and along the bottom, the light catching the glass edges as it goes
    const r = await d.rect(PILL);
    const cy = r.y + r.height / 2;
    const cx = r.x + r.width / 2;
    const right = r.x + r.width;
    const bottom = r.y + r.height;
    await d.mark('rim', PILL);
    await d.trace(
      [
        { x: right + 8, y: cy },
        { x: right - r.height * 0.5, y: r.y - 2 },
        { x: cx, y: r.y - 4 },
        { x: r.x + r.height * 0.5, y: r.y - 2 },
        { x: r.x - 8, y: cy },
        { x: r.x + r.height * 0.5, y: bottom + 2 },
        { x: cx, y: bottom + 4 },
        { x: right - r.height * 0.4, y: bottom + 2 },
      ],
      { duration: 3, ease: 'inOut' }
    );
    // 3. up into the banner: the (×) chip follows the pointer over the glass
    await d.moveTo({ selector: BENTO.banner, anchor: [0.86, 0.55] }, { duration: 0.8, ease: 'inOut' });
    await d.mark('chip', BENTO.banner);
    await d.trace(
      [
        { selector: BENTO.banner, anchor: [0.6, 0.72] },
        { selector: BENTO.banner, anchor: [0.35, 0.3] },
        { selector: BENTO.banner, anchor: [0.16, 0.6] },
      ],
      { duration: 2 }
    );
    await d.wait(0.3);
    // 4. break it, slowed down so the pieces read
    await d.mark('break', BENTO.banner);
    await d.click();
    d.speed(0.4);
    await d.wait(1.8);
    d.speed(1);
    await d.wait(1.6);
    await d.mark('end');
  },
});
