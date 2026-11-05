import React from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, Freeze, Series, staticFile, useCurrentFrame} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {panelSlide, pageFlip} from '../../lib/transitions';
import {C} from '../../lib/theme';
import {STORY_VO, voFrames} from '../../lib/voTiming';
import {S1A, S1D, S2D, S3B, S3D, S3E, S3F} from './B1Problem';
import {S4A, S4B, S4C} from './B2Solution';
import {S3_1, S3_2, S4_1, S4_2} from './B3B4';
import {S5_1, S6_1} from './B5B6';
import {S7_1, S7_2, S8_1, S8_2, S9_1, S9_2} from './B7B8B9';
import {S10_2, S11_1, S11_3} from './B10B11';
import {SCoffee, SDeparture, SHome, STeam} from './NewShots';
import {INSERTS, InsertCaptions} from '../../demo/Inserts';
import {ShotList} from './seq';

export const T = 24; // transition length in frames

/** The 13 beats, in narration order (VOICEOVER.md). Shot durations are nominal; each beat is
 *  time-remapped to the length of its narration from voTiming.ts. */
export const BEATS: {vo: number; shots: ShotList; into: 'panel' | 'flip' | 'cut'}[] = [
  // 1 · The gap
  {vo: 0, shots: [[S3B, 105], [S3E, 90], [S3D, 100], [S3F, 95], [SDeparture, 170]], into: 'cut'},
  // 2 · The other side
  {vo: 1, shots: [[S1A, 120], [S1D, 150], [SCoffee, 110], [S2D, 85]], into: 'panel'},
  // 3 · The solution
  {vo: 2, shots: [[S4A, 90], [S4B, 180], [S4C, 75]], into: 'panel'},
  // 4 · A Leader brings the client
  {vo: 3, shots: [[INSERTS.invite, 135], [INSERTS.open, 105]], into: 'cut'},
  // 5 · Or the client posts it
  {vo: 4, shots: [[S8_2, 250]], into: 'panel'},
  // 6 · The agreement (+ the held payment)
  {vo: 5, shots: [[S3_1, 170], [S3_2, 140], [S4_1, 125]], into: 'flip'},
  // 7 · The team
  {vo: 6, shots: [[INSERTS.notify, 120], [STeam, 200]], into: 'panel'},
  // 8 · Guidance and feedback
  {vo: 7, shots: [[S5_1, 400]], into: 'panel'},
  // 9 · First pay
  {vo: 8, shots: [[S4_2, 110], [S11_1, 95], [S6_1, 270]], into: 'panel'},
  // 10 · Proof
  {vo: 9, shots: [[S9_1, 170], [S9_2, 120]], into: 'panel'},
  // 11 · The journey
  {vo: 10, shots: [[S7_1, 260], [S7_2, 190]], into: 'panel'},
  // 12 · From member to Leader
  {vo: 11, shots: [[S8_1, 200], [S10_2, 210]], into: 'panel'},
  // 13 · Opportunity comes home
  {vo: 12, shots: [[SHome, 200], [S11_3, 120]], into: 'flip'},
];

const nominal = (s: ShotList) => s.reduce((a, [, d]) => a + d, 0);
const hasIn = (i: number) => i > 0 && BEATS[i].into !== 'cut';
/** Sequence length of beat i: its narration, plus the overlap eaten by the next transition. */
export const beatFrames = (i: number) => voFrames(STORY_VO[BEATS[i].vo]) + (i + 1 < BEATS.length && hasIn(i + 1) ? T : 0);
export const STORY_FRAMES = BEATS.reduce((a, b) => a + voFrames(STORY_VO[b.vo]), 0);

/** Beat start frames (they equal the narration start times). */
export const beatStarts = () => {
  let t = 0;
  return BEATS.map((b, i) => {
    const s = t;
    t += voFrames(STORY_VO[b.vo]);
    return {title: STORY_VO[b.vo].title, start: s, seconds: STORY_VO[b.vo].seconds};
  });
};

/** Plays children with their clock scaled by k (k > 1 = faster). */
const Remap: React.FC<{k: number; children: React.ReactNode}> = ({k, children}) => {
  const f = useCurrentFrame();
  return <Freeze frame={Math.floor(f * k)}>{children}</Freeze>;
};

/** A beat's shots, each stretched by the same factor so the beat fills `frames`. */
export const FittedShots: React.FC<{shots: ShotList; frames: number}> = ({shots, frames}) => {
  const n = nominal(shots);
  let used = 0;
  return (
    <Series>
      {shots.map(([Comp, d], i) => {
        const actual = i === shots.length - 1 ? frames - used : Math.max(1, Math.round((d * frames) / n));
        used += actual;
        return (
          <Series.Sequence key={i} durationInFrames={actual}>
            <Remap k={d / actual}>
              <Comp />
            </Remap>
          </Series.Sequence>
        );
      })}
    </Series>
  );
};

export type StoryProps = {vo: boolean};

export const Story: React.FC<StoryProps> = ({vo}) => (
  <InsertCaptions.Provider value={false}>
  <AbsoluteFill style={{backgroundColor: C.paper}}>
    <TransitionSeries>
      {BEATS.map((b, i) => (
        <React.Fragment key={i}>
          {hasIn(i) ? (
            <TransitionSeries.Transition
              presentation={(b.into === 'flip' ? pageFlip() : panelSlide({from: `SC ${i} · SH ${BEATS[i - 1].shots.length}`, to: `SC ${i + 1} · SH 1`})) as ReturnType<typeof panelSlide>}
              timing={linearTiming({durationInFrames: T})}
            />
          ) : null}
          <TransitionSeries.Sequence durationInFrames={beatFrames(i)}>
            <FittedShots shots={b.shots} frames={beatFrames(i)} />
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
    {vo ? <Audio src={staticFile('vo/story.m4a')} /> : null}
  </AbsoluteFill>
  </InsertCaptions.Provider>
);

export const calcStory: CalculateMetadataFunction<StoryProps> = async () => {
  let vo = false;
  try {
    vo = (await fetch(staticFile('vo/story.m4a'), {method: 'HEAD'})).ok;
  } catch {
    vo = false;
  }
  return {durationInFrames: STORY_FRAMES, props: {vo}};
};
