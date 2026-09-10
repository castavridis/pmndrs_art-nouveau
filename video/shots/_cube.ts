// Helpers for takes on /dev/cube. They reach into the scene through the dev handles
// (window.__nav3dRoots), so these shots are captured with `--dev`.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Director, Point } from '../capture/director';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const saved = (f: string) => JSON.parse(readFileSync(join(repo, 'src/nav/Nav3D', f), 'utf8'));

/**
 * The cube page's storage for a take: the shipped tuning as the page's own persisted tuning
 * (on a first visit the page would otherwise swap in the clear-glass preset), and the swarms
 * kept inside the blocks, 92 petals and 17 flowers, as the cube was being tuned.
 */
export const CUBE_STORAGE: Record<string, string> = {
  'cube-tuning': JSON.stringify({ state: { schemes: saved('tuning.saved.json') }, version: 4 }),
  'cube-scene': JSON.stringify({
    state: { svg: false, insideOnly: true, petalsInside: 92, petalsOutside: 60, flowersInside: 17, flowersOutside: 10 },
    version: 0,
  }),
};

/** The page chrome a take does not want: the theme toggle and the re-center button. */
export const CUBE_CSS = `
  button[aria-label^="Theme:"], button[title^="Re-center"] { display: none !important; }
`;

/** The camera's home (the page's framePosition): the reset view, the logo face on. */
export const HOME = { azimuth: 0, radius: 26, y: 0.4 };

export interface Orbit {
  /** Degrees around the model; 0 is face on, -90 looks at its left side (the viewer's left). */
  azimuth: number;
  radius: number;
  y: number;
}

/** Put the camera on an orbit around the model's centre, looking at it. */
export async function setOrbit(d: Director, o: Orbit) {
  await d.evaluate((o: Orbit) => {
    const r = (window as any).__nav3dRoots[0];
    const a = (o.azimuth * Math.PI) / 180;
    r.camera.position.set(o.radius * Math.sin(a), o.y, o.radius * Math.cos(a));
    r.controls.target.set(0, 0, 0);
    r.controls.update();
  }, o);
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Fly the camera from one orbit to another over `seconds`, recorded frame by frame. */
export async function fly(d: Director, from: Orbit, to: Orbit, seconds: number, ease = easeInOut) {
  const n = Math.max(1, Math.round(seconds * 60));
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n);
    await setOrbit(d, {
      azimuth: from.azimuth + (to.azimuth - from.azimuth) * t,
      // zoom evenly: interpolate the distance's logarithm
      radius: Math.exp(Math.log(from.radius) + (Math.log(to.radius) - Math.log(from.radius)) * t),
      y: from.y + (to.y - from.y) * t,
    });
    await d.wait(1 / 60);
  }
}

/**
 * Where on screen (CSS px) a petal or flower inside the blocks is right now: the one nearest
 * `near`, among those comfortably inside the frame.
 */
export async function body(d: Director, kind: 'petal' | 'flower', near: Point): Promise<Point> {
  return d.evaluate(
    ({ kind, near }: { kind: string; near: Point }) => {
      const r = (window as any).__nav3dRoots[0];
      const W = innerWidth;
      const H = innerHeight;
      const m4 = new r.camera.matrix.constructor();
      const v = new r.camera.position.constructor();
      let best: { x: number; y: number; d: number } | null = null;
      r.scene.traverse((o: any) => {
        if (!o.isInstancedMesh || !o.name.startsWith(`${kind} inside`)) return;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m4);
          v.setFromMatrixPosition(m4).applyMatrix4(o.matrixWorld).project(r.camera);
          const x = ((v.x + 1) / 2) * W;
          const y = ((1 - v.y) / 2) * H;
          if (x < W * 0.12 || x > W * 0.88 || y < H * 0.12 || y > H * 0.88) continue;
          const dist = Math.hypot(x - near.x, y - near.y);
          if (!best || dist < best.d) best = { x, y, d: dist };
        }
      });
      if (!best) throw new Error(`no ${kind} on screen`);
      return { x: (best as any).x, y: (best as any).y };
    },
    { kind, near }
  );
}

/** Glide to a body and stay on it while it drifts: re-aimed just before landing. */
export async function visit(d: Director, kind: 'petal' | 'flower', near: Point, travel: number, dwell: number) {
  const first = await body(d, kind, near);
  await d.moveTo(first, { duration: travel * 0.8, ease: 'inOut' });
  await d.moveTo(await body(d, kind, first), { duration: travel * 0.2, ease: 'out' });
  await d.wait(dwell);
}

/** The page camera's field of view (NavCanvas's FOV), where the opening ends. */
const FOV = 22;
/** The opening's first field of view: a long lens, so the line of sight is a thin one. */
const NARROW = 3;
/** Where the camera starts, on the model's left, looking straight across it. */
const START_X = -10;

/**
 * The clearest line of sight across the model from its left: the (y, z) whose view, through a
 * long lens, passes furthest from every petal and flower in every block along the way, so the
 * frame starts on nothing but the dark inside of the glass. The view widens with depth, and a
 * flower is broader than a petal, so both count against a line.
 */
export async function emptiestLine(d: Director): Promise<{ y: number; z: number }> {
  return d.evaluate(
    ({ startX, narrow }: { startX: number; narrow: number }) => {
      const r = (window as any).__nav3dRoots[0];
      const m4 = new r.camera.matrix.constructor();
      const v = new r.camera.position.constructor();
      const spread = Math.tan(((narrow / 2) * Math.PI) / 180) * 1.42; // to the frame's corners
      const bodies: [number, number, number, number][] = []; // x, y, z, extent
      r.scene.traverse((o: any) => {
        if (!o.isInstancedMesh || !/inside/.test(o.name)) return;
        const extent = o.name.startsWith('flower') ? 0.65 : 0.3;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m4);
          v.setFromMatrixPosition(m4).applyMatrix4(o.matrixWorld);
          bodies.push([v.x, v.y, v.z, extent]);
        }
      });
      let best = { y: 0, z: 0, clear: -Infinity };
      // within the left block's face, so the line starts in glass rather than the page
      for (let y = -1.1; y <= 1.1; y += 0.05)
        for (let z = -3.7; z <= 3.7; z += 0.05) {
          let clear = Infinity;
          for (const [bx, by, bz, e] of bodies) {
            clear = Math.min(clear, Math.hypot(by - y, bz - z) - (bx - startX) * spread - e);
          }
          if (clear > best.clear) best = { y, z, clear };
        }
      return { y: best.y, z: best.z };
    },
    { startX: START_X, narrow: NARROW }
  );
}

/**
 * The opening: through a long lens, down the clearest line across the model, nothing but dark
 * glass — then it goes. The lens snaps wide at once (flowers burst out of the dark), while the
 * camera pulls back, re-aims and swings round into the reset view, each a beat after the last,
 * all settling together on the logo. Brisk rather than stately: the lens leaves at full speed,
 * everything else eases in and out inside its own stretch.
 */
export async function opening(d: Director, line: { y: number; z: number }, seconds: number) {
  // 0 seconds parks the camera on the opening's first frame
  const n = Math.round(seconds * 60);
  const inOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
  const out = (t: number) => 1 - (1 - t) ** 3;
  const clamp = (u: number, a: number, b: number) => Math.min(1, Math.max(0, (u - a) / (b - a)));
  const span = (u: number, a: number, b: number) => inOut(clamp(u, a, b));
  const logLerp = (a: number, b: number, t: number) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
  const R0 = -START_X;
  for (let i = 0; i <= n; i++) {
    const u = n ? i / n : 0;
    const fov = logLerp(NARROW, FOV, out(clamp(u, 0, 0.55)));
    const R = logLerp(R0, HOME.radius, span(u, 0.05, 1));
    const aim = span(u, 0.1, 0.95);
    const a = ((-90 + 90 * span(u, 0.2, 1)) * Math.PI) / 180;
    const t = { x: 0, y: line.y * (1 - aim), z: line.z * (1 - aim) };
    const lift = HOME.y * span(u, 0.2, 1);
    await d.evaluate(
      ({ t, R, a, lift, fov }: { t: { x: number; y: number; z: number }; R: number; a: number; lift: number; fov: number }) => {
        const r = (window as any).__nav3dRoots[0];
        r.camera.fov = fov;
        r.camera.updateProjectionMatrix();
        r.camera.position.set(t.x + R * Math.sin(a), t.y + lift, t.z + R * Math.cos(a));
        r.controls.target.set(t.x, t.y, t.z);
        r.controls.update();
      },
      { t, R, a, lift, fov }
    );
    if (i > 0) await d.wait(1 / 60);
  }
}
