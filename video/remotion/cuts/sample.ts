import type { Reel } from '../edit';

/**
 * A starter reel, so the pipeline renders end to end: the bento, then `T`.
 * Replace with real cuts (see .claude/skills/make-video/SKILL.md).
 * Times: `from` is seconds into the clip; camera `t` is seconds into the cut.
 */
export const sample: Reel = {
  bpm: 120,
  music: 'music/beat-120.wav',
  cuts: [
    {
      clip: 'theme-key',
      from: 0,
      beats: 8,
      camera: [
        { t: 0, zoom: 1, focus: 'center' },
        { t: 1.6, zoom: 1.5, focus: 'mark:switch', ease: 'inOut' },
        { t: 4, zoom: 1.2, focus: 'center', ease: 'inOut' },
      ],
    },
  ],
};
