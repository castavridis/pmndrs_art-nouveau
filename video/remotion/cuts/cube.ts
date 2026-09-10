import type { Cut, Reel } from '../edit';

/**
 * Pmndrs Cube: one continuous take of /dev/cube (shots/cube.ts), square, ~16 s.
 *
 * Black, then a field of flowers blooming out of it as a long lens across the model widens and
 * eases back, swinging round into the logo (no fade: the take itself opens on black); the
 * pointer wakes a petal and a flower, switches the page to dark on T, sweeps the ray across,
 * visits the blossoms again and throws them all with a click.
 *
 * Cut as a speed ramp rather than jump cuts: each segment starts in the clip exactly where the
 * last one ended, and only its playback rate changes, so the take never visibly skips. The
 * reveal and the burst play at speed; the hovers and the sweep, where the pointer is only
 * travelling, run faster. The camera stays at 1 so the logo keeps its margin in the frame.
 */
const BPM = 120;
const DARK_PAGE = '#161712';

type Segment = [clipFrom: number, clipTo: number, rate: number, extra?: Partial<Cut>];

/** Contiguous segments of one clip → cuts on the beat grid, each as long as it plays for. */
function ramp(clip: string, segments: Segment[]): Cut[] {
  return segments.map(([from, to, rate, extra]) => ({
    clip,
    from,
    rate,
    beats: ((to - from) / rate) * (BPM / 60),
    // no zoom kick on every segment boundary: this is one shot, not a montage
    punch: false,
    ...extra,
  }));
}

export const cube: Reel = {
  bpm: BPM,
  music: 'music/beat-120.wav',
  // it greys the light page's corners, and the logo wants its whole margin
  vignette: false,
  cuts: ramp('cube', [
    // black, then the field of flowers, then the logo: one slow ease at speed (marks: black 0, logo 7.2)
    // from the take's second frame: its first is a single stray magenta one, as the long lens is set
    [1 / 60, 7.2, 1],
    // a petal, then a flower, in the light (petal 7.5, flower 8.9)
    [7.2, 10.1, 1.3],
    // to the bottom left through the switch to dark, then the ray's sweep (theme 10.1, sweep 11.65)
    [10.1, 13.65, 1.15],
    // back in along the same line: a petal and a flower in the dark (dark-petal 13.65, dark-flower 14.5)
    [13.65, 15.75, 1.3],
    // the click at 15.75 and the burst; the press punches in, the camera jolts, then fade to the page
    [15.75, 17.6, 1, { punch: true, shake: 0.03, fadeOut: { seconds: 0.9, color: DARK_PAGE } }],
  ]),
};
