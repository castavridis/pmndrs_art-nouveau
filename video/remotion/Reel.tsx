import {
  AbsoluteFill,
  Html5Audio,
  Sequence,
  staticFile,
  useVideoConfig,
  type CalculateMetadataFunction,
} from 'remotion';
import { layout, type ClipMeta, type Reel as ReelSpec } from './edit';
import { CutSfx } from './Sfx';
import { Shot } from './Shot';
import { Card, Flash, Word } from './Type';

export type ReelProps = { reel: ReelSpec; metas?: Record<string, ClipMeta> };

/** Plays a reel: its cuts back to back on the beat grid, with words, cards and the music. */
export function Reel({ reel, metas = {} }: ReelProps) {
  const { fps } = useVideoConfig();
  const { starts, total } = layout(reel, fps);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {reel.cuts.map((cut, i) => {
        const meta = metas[cut.clip];
        const from = starts[i]!;
        const to = starts[i + 1] ?? total;
        if (!meta) throw new Error(`no clip "${cut.clip}" — capture it: pnpm capture ${cut.clip}`);
        return (
          <Sequence
            key={i}
            from={from}
            durationInFrames={to - from}
            name={`${i + 1}. ${cut.clip}${cut.word ? ` · ${cut.word}` : ''}`}
          >
            <Shot cut={cut} meta={meta} />
            {cut.word && (
              <Sequence from={Math.round((cut.wordAt ?? 0) * fps)} layout="none">
                <Word text={cut.word} color={cut.color} kicker={cut.kicker} />
              </Sequence>
            )}
            {cut.card && <Card {...cut.card} />}
            {cut.flash && <Flash />}
            {reel.sfx !== false && <CutSfx cut={cut} meta={meta} durationInFrames={to - from} />}
          </Sequence>
        );
      })}
      {/* a soft vignette pulls the eye to the middle, where the action is */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 62%, rgba(0,0,0,0.35) 100%)',
          pointerEvents: 'none',
        }}
      />
      {reel.music && (
        <Html5Audio
          src={staticFile(reel.music)}
          volume={0.55}
          trimBefore={Math.round((reel.musicFrom ?? 0) * fps)}
        />
      )}
    </AbsoluteFill>
  );
}

/** Length from the beat grid; clip metadata fetched once, before the first frame. */
export const reelMetadata: CalculateMetadataFunction<ReelProps> = async ({ props }) => {
  const names = [...new Set(props.reel.cuts.map((c) => c.clip))];
  const metas: Record<string, ClipMeta> = {};
  await Promise.all(
    names.map(async (n) => {
      const res = await fetch(staticFile(`clips/${n}.json`));
      if (!res.ok) throw new Error(`no clip "${n}" — capture it: pnpm capture ${n}`);
      metas[n] = await res.json();
    })
  );
  const fps = 60;
  return { durationInFrames: layout(props.reel, fps).total, fps, props: { ...props, metas } };
};
