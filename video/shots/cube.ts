import { defineShot } from '../capture/director';
import { SQUARE } from './_common';
import { CUBE_CSS, CUBE_STORAGE, emptiestLine, opening, visit } from './_cube';

/**
 * The pmndrs cube, not yet recognisable: black, then a field of flowers bursting out of it as
 * a long lens looking across the model snaps wide and pulls back, swinging round into the logo.
 * Then the pointer wakes the blossoms with the roaming light, the page switches to dark on T,
 * the ray sweeps after the pointer, and a click throws every petal and flower. Captured with
 * `--dev` (camera and body positions come from the dev handles).
 */
let line = { y: 0, z: 0 };

export default defineShot({
  path: '/dev/cube',
  ready: '[data-3d], canvas',
  ...SQUARE,
  warmup: 3,
  storage: CUBE_STORAGE,
  css: CUBE_CSS,
  setup: async (d) => {
    await d.skip(1.5);
    line = await emptiestLine(d);
    await opening(d, line, 0); // park on the first frame of the opening
    await d.skip(0.2);
  },
  script: async (d) => {
    // 1. a beat of black, then the field of flowers bursts out and swings round into the logo
    await d.mark('black');
    await d.wait(0.3);
    await opening(d, line, 3.8);
    await d.mark('logo');
    await d.wait(0.3);
    // 2. the pointer wakes a petal, then a flower
    await d.mark('petal');
    await visit(d, 'petal', { x: 380, y: 400 }, 1.1, 0.3);
    await d.mark('flower');
    await visit(d, 'flower', { x: 580, y: 560 }, 0.9, 0.3);
    // 3. off to the bottom left, switching to dark on the way
    await d.mark('theme');
    await d.moveTo({ x: 300, y: 700 }, { duration: 0.5, ease: 'in' });
    await d.key('t');
    await d.moveTo({ x: 90, y: 860 }, { duration: 0.7, ease: 'out' });
    await d.wait(0.35);
    // 4. the ray sweeps after the pointer, left to right
    await d.mark('sweep');
    await d.moveTo({ x: 880, y: 500 }, { duration: 2.0, ease: 'inOut', bend: 0.18 });
    // 5. back in along the same line: a petal, a flower, then the middle
    await d.mark('dark-petal');
    await visit(d, 'petal', { x: 700, y: 490 }, 0.6, 0.25);
    await d.mark('dark-flower');
    await visit(d, 'flower', { x: 590, y: 480 }, 0.55, 0.25);
    await d.moveTo({ x: 480, y: 480 }, { duration: 0.45, ease: 'inOut' });
    // 6. a click throws them all
    await d.mark('burst');
    await d.click();
    await d.wait(3.4);
    await d.mark('end');
  },
});
