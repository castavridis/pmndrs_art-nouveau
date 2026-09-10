// The vocabulary of an edit. A reel is a list of cuts on a beat grid; each cut
// shows a stretch of one captured clip through a camera, with an optional
// kinetic word or title card on top. Edits live in `remotion/cuts/`.
import { Easing } from 'remotion';

/** The official pmndrs palette (the glass tints in src/nav/Nav3D/tuning.ts). */
export const palette = {
  dark: '#36342f',
  light: '#eae5da',
  purple: '#d855f9',
  red: '#ff4980',
  orange: '#ffc043',
  yellow: '#ebff0f',
  green: '#caf543',
  teal: '#00f7a3',
  blue: '#2bdcf6',
} as const;
export type PaletteName = keyof typeof palette;

/**
 * Where the camera looks, in the captured page's CSS px:
 * a point, the page centre, the pointer (smoothed), or a mark the shot recorded
 * with a selector (`d.mark('copy', selector)` → `'mark:copy'`).
 */
export type Focus = [number, number] | 'center' | 'cursor' | `mark:${string}`;
export type EaseName = 'linear' | 'in' | 'out' | 'inOut' | 'snap';

export interface CameraKey {
  /** Seconds into the cut. */
  t: number;
  /** 1 = the whole page fills the frame; 2 = twice as close. */
  zoom: number;
  focus?: Focus;
  /** How the camera gets here from the previous key. */
  ease?: EaseName;
}

export interface Cut {
  /** A clip in public/clips (a shot's name). */
  clip: string;
  /** Seconds into the clip where this cut starts. */
  from: number;
  /** Screen length, in beats of the reel's tempo. */
  beats: number;
  /** Playback speed of the footage (the capture can also do true slow motion). */
  rate?: number;
  /** Camera keys; default is the whole page. */
  camera?: CameraKey[];
  /**
   * Where on screen the camera's focus lands, as fractions of the frame.
   * Default: the middle, or up and to the right of it when a word is shown,
   * so the subject stays clear of the word.
   */
  frameAt?: [number, number];
  /** A kinetic word, e.g. 'Splat.' — its full stop takes `color`. */
  word?: string;
  color?: PaletteName;
  /** Seconds into the cut the word lands (default: on the cut). */
  wordAt?: number;
  /** Small line above the word. */
  kicker?: string;
  /** A title card instead of a word. */
  card?: { title: string; subtitle?: string };
  /** A white flash on the cut. */
  flash?: boolean;
  /** A jolt of camera shake (and an impact sound) this many seconds into the cut. */
  shake?: number;
  /** An impact sound, without the shake, this many seconds into the cut. */
  hit?: number;
  /** A whoosh into the cut. */
  whoosh?: boolean;
  /** Zoom kick on every press in the footage. Default true. */
  punch?: boolean;
  /** Draw the recorded pointer. Default true. */
  cursor?: boolean;
  /** The green ring the pointer throws where it clicks. Default true. */
  ring?: boolean;
  /** Fade up from a flat colour at the start of the cut. */
  fadeIn?: Fade;
  /** Fade down to a flat colour at the end of the cut. */
  fadeOut?: Fade;
}

export interface Fade {
  seconds: number;
  /** Any CSS colour: black, or the page's own background to fade to the page. */
  color: string;
}

export interface Reel {
  bpm: number;
  cuts: Cut[];
  /** A file in public/, e.g. 'music/beat-120.wav'. */
  music?: string;
  /** Seconds into the music file where the reel starts. */
  musicFrom?: number;
  /** Sound effects from public/sfx: a click on every press, impacts, whooshes. Default true. */
  sfx?: boolean;
  /** A soft darkening at the frame's corners. Default true; it greys a light page's corners. */
  vignette?: boolean;
}

/** What a capture wrote next to its footage (capture/director.ts `ClipMeta`). */
export interface ClipMeta {
  name: string;
  fps: number;
  frames: number;
  duration: number;
  viewport: { width: number; height: number };
  scale: number;
  cursor: [number, number, 0 | 1][];
  speed: number[];
  marks: {
    name: string;
    frame: number;
    time: number;
    rect?: { x: number; y: number; width: number; height: number };
  }[];
}

export const EASINGS: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  in: Easing.in(Easing.cubic),
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  snap: Easing.out(Easing.poly(5)),
};

export const framesPerBeat = (bpm: number, fps: number) => (60 / bpm) * fps;

/** Frame at which each cut starts, and the reel's length, on the beat grid. */
export function layout(reel: Reel, fps: number) {
  const fpb = framesPerBeat(reel.bpm, fps);
  let beat = 0;
  const starts = reel.cuts.map((c) => {
    const s = Math.round(beat * fpb);
    beat += c.beats;
    return s;
  });
  return { starts, total: Math.round(beat * fpb), fpb };
}
