import { Composition } from 'remotion';
import { sample } from './cuts/sample';
import { Reel, reelMetadata } from './Reel';

// One composition per reel in cuts/. The frame's shape should match the shots'
// viewport: square reels are filmed at 960×960 (shots/_common.ts SQUARE).
// A vertical cut would be 1080×1920 with shots filmed in a tall viewport.
export function Root() {
  return (
    <>
      <Composition
        id="Sample"
        component={Reel}
        width={1080}
        height={1080}
        fps={60}
        durationInFrames={1}
        defaultProps={{ reel: sample }}
        calculateMetadata={reelMetadata}
      />
    </>
  );
}
