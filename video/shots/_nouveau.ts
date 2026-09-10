// The Art Nouveau reel: the bento's flowers, outlines and glass, framed square with the
// column filling the frame to about 1.5rem of margin.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BrowserContext } from 'playwright';
import type { Director } from '../capture/director';

/**
 * The reel's own look, when there is one: `nouveau.look.json` holds the dev page's localStorage
 * (`nav-tuning` with both schemes, `custom-presets`, `palette-tuning`), copied from a panel
 * session. Only a dev build reads those stores, so with a look the takes are captured `--dev`;
 * without one they film the shipped tuning (src/nav/Nav3D/*.saved.json). Values may be kept as
 * objects for readability (stringified here); keys starting with `_` are notes.
 */
const lookFile = join(dirname(fileURLToPath(import.meta.url)), 'nouveau.look.json');
export const NV_LOOK: Record<string, string> | undefined = existsSync(lookFile)
  ? Object.fromEntries(
      Object.entries(JSON.parse(readFileSync(lookFile, 'utf8')) as Record<string, unknown>)
        .filter(([k, v]) => !k.startsWith('_') && v != null)
        .map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
    )
  : undefined;

/** With a look, refuse a production take (it would silently film the shipped tuning instead). */
export async function checkLook(d: Director) {
  if (!NV_LOOK?.['nav-tuning']) return;
  const live = await d.evaluate(() => {
    const s = (window as any).__navTuning?.getState();
    return s && { scheme: s.scheme as string, distortion: s.glass.distortion as number, studio: s.env.studio as string };
  });
  if (!live) throw new Error('nouveau.look.json is set: capture with --dev so the page reads it');
  const want = JSON.parse(NV_LOOK['nav-tuning']).state.schemes[live.scheme]?.glass?.distortion;
  if (want !== undefined && want !== live.distortion) {
    throw new Error(`the look did not load: ${live.scheme} distortion is ${live.distortion}, want ${want}`);
  }
  console.log(`  look: ${live.scheme}, ${live.studio} studio, distortion ${live.distortion}`);
}

/**
 * A 864 px square page (54rem) at 2.5×: 2160 px footage, twice the 1080 output. At this width
 * the banner's flourishes come to about 1.5rem off the sides, and with the top padding below
 * the column runs from the flowers over the banner to the theme switch with the same margin
 * top and bottom.
 */
export const NV = { viewport: { width: 864, height: 864 }, scale: 2.5 } as const;

/** Below the switch (the plain controls, the onward links) is off the reel; it keeps its space. */
export const NV_CSS = `
  main[class*="_page_"] { padding-top: 52px !important; }
  main > section:nth-of-type(3), main > nav[aria-label="More"] { visibility: hidden !important; }
`;

export const PILL = 'nav[aria-label="Main"] [class*="_pill_"]';

/**
 * Hold the 3D's models back until `release()`: the page stays on its vector outlines, so a take
 * can film the outlines drawing in before any glass exists. Call `hold()` in `prepare`.
 */
export function glbGate() {
  let open!: () => void;
  const released = new Promise<void>((r) => (open = r));
  return {
    hold: async (context: BrowserContext) => {
      await context.route('**/*.glb', async (route) => {
        await released;
        await route.continue().catch(() => {});
      });
    },
    release: () => open(),
  };
}

/**
 * Freeze what is on screen as a still laid over the page, so what happens underneath (the 3D
 * coming up) can be skipped and then revealed as one dissolve.
 */
export async function freezeFrame(d: Director) {
  const png = await d.page.screenshot({ type: 'png' });
  await d.page.evaluate((src) => {
    const img = document.createElement('img');
    img.id = 'nv-freeze';
    img.src = src;
    Object.assign(img.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '2147483647',
      pointerEvents: 'none',
    });
    document.body.appendChild(img);
    return img.decode();
  }, `data:image/png;base64,${png.toString('base64')}`);
}

/** Dissolve the frozen still off the live page, then remove it. */
export async function dissolve(d: Director, seconds: number) {
  await d.evaluate((ms) => {
    const img = document.getElementById('nv-freeze');
    if (!img) return;
    img.style.transition = `opacity ${ms}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    requestAnimationFrame(() => (img.style.opacity = '0'));
  }, seconds * 1000);
  await d.wait(seconds + 0.05);
  await d.evaluate(() => document.getElementById('nv-freeze')?.remove());
}

/** Let time pass off camera until a selector shows (the 3D layer coming up). */
export async function skipUntil(d: Director, selector: string, maxSeconds = 20) {
  for (let t = 0; t < maxSeconds; t += 1 / 30) {
    if (await d.page.locator(selector).first().isVisible().catch(() => false)) return;
    await d.skip(1 / 30);
  }
  throw new Error(`"${selector}" never appeared`);
}
