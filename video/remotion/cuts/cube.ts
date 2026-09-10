import type { Cut, Reel } from '../edit';

/**
 * Pmndrs Cube: one continuous take of /dev/cube (shots/cube.ts), square, ~14.4 s, silent.
 *
 * Black, then a field of flowers bursting out of it as a long lens across the model snaps wide
 * and pulls back, swinging round into the logo (no fade: the take itself opens on black); the
 * pointer wakes a petal and a flower, switches the page to dark on T, sweeps the ray across,
 * visits the blossoms again and throws them all with a click.
 *
 * Cut as a speed ramp rather than jump cuts: each segment starts in the clip exactly where the
 * last one ended, and only its playback rate changes, so the take never visibly skips. The
 * opening and the burst play at speed, the burst with room to settle; the hovers and the sweep,
 * where the pointer is only travelling, run faster. The camera stays at 1 so the logo keeps its
 * margin in the frame.
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
  // silent: no music, no clicks or impacts
  sfx: false,
  // it greys the light page's corners, and the logo wants its whole margin
  vignette: false,
  cuts: ramp('cube', [
    // a beat of black, then the flowers burst out and swing round into the logo (marks: black 0, logo 4.1)
    [0, 4.1, 1],
    // a petal, then a flower, in the light (petal 4.4, flower 5.8)
    [4.1, 7.0, 1.3],
    // to the bottom left through the switch to dark, then the ray's sweep (theme 7.0, sweep 8.55)
    [7.0, 10.55, 1.15],
    // back in along the same line: a petal and a flower in the dark (dark-petal 10.55, dark-flower 11.4)
    [10.55, 12.65, 1.3],
    // the click at 12.65 and the burst, left to play out before the fade to the page
    [12.65, 16.0, 1, { punch: true, shake: 0.03, fadeOut: { seconds: 1, color: DARK_PAGE } }],
  ]),
};
