import { defineShot } from '../capture/director';
import { BENTO, READY_3D } from './_common';
import { NV, NV_CSS, NV_LOOK, PILL, checkLook, dissolve, freezeFrame, glbGate, skipUntil } from './_nouveau';

/**
 * The bento from nothing: the dark ground, the traced outlines drawing themselves in curve by
 * curve, then the glass dissolving up over them. The 3D's models are held back until the
 * outlines are done, so the page sits on its vector state for as long as the take wants; the
 * 3D then comes up off camera under a frozen frame, which dissolves. Then the pointer drifts
 * through the petals, stirring them and dragging the light across the flowers.
 */
const gate = glbGate();

// Hides the page's contents and holds the outlines' draw animation, so the roll starts blank.
const HOLD = '[data-drawn-outline] path { animation: none !important; } main { opacity: 0; }';

export default defineShot({
  path: '/',
  ...NV,
  warmup: 0.5,
  css: NV_CSS,
  storage: NV_LOOK,
  prepare: gate.hold,
  cursorStart: { x: -40, y: 520 },
  setup: async (d) => {
    await checkLook(d);
    await d.evaluate((css) => {
      const s = document.createElement('style');
      s.id = 'nv-hold';
      s.textContent = css;
      document.head.appendChild(s);
    }, HOLD);
    await d.skip(0.3);
  },
  script: async (d) => {
    // 1. the blank ground, then the page fades up as its outlines draw in
    await d.mark('blank');
    await d.wait(0.4);
    await d.mark('draw', 'main');
    await d.evaluate(() => {
      const main = document.querySelector('main')!;
      main.style.transition = 'opacity 900ms ease';
      document.getElementById('nv-hold')?.remove();
    });
    await d.wait(2.3);
    // 2. the glass: the 3D comes up off camera, under the last frame of the outlines
    await freezeFrame(d);
    gate.release();
    await skipUntil(d, READY_3D);
    await d.skip(1);
    await d.mark('glass', 'main');
    await dissolve(d, 1.1);
    await d.wait(0.3);
    // 3. through the space: the pointer drifts in from the side, through the petals around
    //    the nav's flowers and down past the callout, stirring them as it goes
    await d.mark('roam', PILL);
    await d.trace(
      [
        { x: 40, y: 470 },
        { x: 170, y: 330 },
        { x: 260, y: 180 },
        { x: 430, y: 390 },
        { x: 640, y: 300 },
        { x: 720, y: 170 },
        { x: 800, y: 420 },
      ],
      { duration: 3.2 }
    );
    await d.wait(0.8);
    await d.mark('end', BENTO.nav);
  },
});
