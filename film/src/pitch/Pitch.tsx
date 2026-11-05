import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, Freeze, Sequence, Series, staticFile, useCurrentFrame} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {C} from '../lib/theme';
import {HText, Shot, Bloom} from '../lib/paint';
import {E, ramp} from '../lib/anim';
import {PITCH_BEATS, PITCH_FRAMES, beatFramesP} from '../lib/pitchTiming';
import {Chapter, Group, pan} from '../demo/Demo';
import {INSERTS, InsertCaptions} from '../demo/Inserts';
import {Manifest, Plan, PlayStep} from '../demo/timeline';
import {AppHome, BigPhone} from '../props/big';
import {S1D, S2D, S3B, S3D, S3E, S3F} from '../scenes/story/B1Problem';
import {S4B, S4C} from '../scenes/story/B2Solution';
import {S4_1} from '../scenes/story/B3B4';
import {S5_1, S6_1} from '../scenes/story/B5B6';
import {S7_1, S7_2, S8_1, S8_2, S9_1} from '../scenes/story/B7B8B9';
import {S10_1, S10_2, S11_3} from '../scenes/story/B10B11';
import {SCoffee, SDeparture, SHome, STeam} from '../scenes/story/NewShots';

/* ------------------------------------------------------------------ */
/* Drawn segments: a window [from, to] of a shot, remapped to `frames` */
/* ------------------------------------------------------------------ */

type Seg = [React.FC, number, number, number]; // component, from, to, output frames

const SegPlay: React.FC<{seg: Seg}> = ({seg}) => {
  const f = useCurrentFrame();
  const [Comp, from, to, frames] = seg;
  return (
    <Freeze frame={Math.round(from + ((to - from) * f) / Math.max(1, frames))}>
      <Comp />
    </Freeze>
  );
};

const Drawn: React.FC<{segs: Seg[]}> = ({segs}) => (
  <Series>
    {segs.map((s, i) => (
      <Series.Sequence key={i} durationInFrames={s[3]}>
        <SegPlay seg={s} />
      </Series.Sequence>
    ))}
  </Series>
);

/** End of Act 1: the hand-off into live software. */
const HandOff: React.FC = () => {
  const f = useCurrentFrame();
  const up = ramp(f, 0, 22, E.out);
  return (
    <Shot>
      <Bloom cx={960} cy={540} rx={600} ry={420} color={C.marigoldTint} op={0.5} />
      <g transform={`translate(0 ${(1 - up) * 700})`}>
        <BigPhone x={1180} y={140} w={420} h={820} seed={4000} rot={4} glow={up}>
          {(sx, sy, sw, sh) => <AppHome sx={sx} sy={sy} sw={sw} sh={sh} p={ramp(f, 14, 50)} seed={4001} />}
        </BigPhone>
      </g>
      <HText x={180} y={520} size={96} reveal={ramp(f, 16, 40)} font={undefined}>
        This is the real app.
      </HText>
      <HText x={184} y={600} size={40} color={C.inkSoft} reveal={ramp(f, 30, 50)}>
        sajha-kaam.onrender.com
      </HText>
    </Shot>
  );
};

/* ------------------------------------------------------------------ */
/* Beat plans                                                          */
/* ------------------------------------------------------------------ */

const ACT13: Record<number, Seg[]> = {
  1: [[S3B, 0, 105, 130], [S3E, 0, 90, 100], [S3D, 0, 100, 120], [S3F, 0, 100, 100]],
  2: [[SDeparture, 0, 170, 210]],
  3: [[S1D, 0, 150, 150], [SCoffee, 0, 110, 150], [S2D, 0, 85, 120]],
  4: [[S4B, 30, 180, 115], [S4C, 0, 75, 80], [HandOff, 0, 75, 75]],
  12: [[S6_1, 0, 270, 300], [S10_1, 0, 170, 250], [S10_2, 0, 210, 350]],
  13: [[S7_2, 0, 230, 300], [S4_1, 0, 140, 210]],
  14: [[SHome, 0, 200, 360], [S11_3, 0, 120, 180]],
};

type Part = {drawn: Seg[]} | {chapters: number[]};
const ACT2: Record<number, {card: [number, string]; parts: Part[]}> = {
  5: {card: [1, 'Leader brings the client'], parts: [{drawn: [[INSERTS.invite, 20, 120, 90]]}, {chapters: [1]}]},
  6: {card: [2, 'Client posts'], parts: [{drawn: [[S8_2, 100, 250, 90]]}, {chapters: [8]}]},
  7: {card: [3, 'Team'], parts: [{drawn: [[STeam, 20, 170, 90]]}, {chapters: [2]}]},
  8: {card: [4, 'Guided'], parts: [{drawn: [[S5_1, 150, 300, 90]]}, {chapters: [3, 4]}]},
  9: {card: [5, 'First pay'], parts: [{chapters: [5]}, {drawn: [[S6_1, 0, 270, 120]]}, {chapters: [6]}]},
  10: {card: [6, 'Proof'], parts: [{drawn: [[S9_1, 20, 140, 60], [S7_1, 60, 260, 60]]}, {chapters: [7]}]},
  11: {card: [7, 'Leaders'], parts: [{drawn: [[S8_1, 0, 200, 90]]}, {chapters: [9]}]},
};

export const PAN = 15;
const CARD = 60;
const TAIL = 30; // the last second of every clip (the tap / the result) always plays at 1x

type RawStep = PlayStep & {natural: number};
type Item = {kind: 'card'; n: number; title: string; frames: number} | {kind: 'drawn'; segs: Seg[]; frames: number} | {kind: 'group'; steps: PlayStep[]; frames: number};

const groupSteps = (steps: RawStep[]) => {
  const g: RawStep[][] = [];
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].pair && steps[i + 1]?.pair) {
      g.push([steps[i], steps[i + 1]]);
      i++;
    } else g.push([steps[i]]);
  }
  return g;
};

/** Builds one Act-2 beat so it lasts exactly `B` frames: clips get a fast head and a 1x tail. */
export const buildAct2 = (beat: number, steps: RawStep[], B: number) => {
  const plan = ACT2[beat];
  type BP = {drawn: Seg[]; groups?: undefined} | {groups: RawStep[][]; drawn?: undefined};
  const parts: BP[] = plan.parts.map((p): BP => ('drawn' in p ? {drawn: p.drawn.map((s) => [...s] as Seg)} : {groups: groupSteps(steps.filter((s) => p.chapters.includes(s.chapter ?? 0)))}));
  const nGroups = parts.reduce((a, p) => a + (p.groups ? p.groups.length : 0), 0);
  const nItems = 1 + parts.reduce((a, p) => a + (p.groups ? p.groups.length : 1), 0);
  const drawnF = parts.reduce((a, p) => a + (p.drawn ? p.drawn.reduce((x, s) => x + s[3], 0) : 0), 0);
  const C0 = B + (nItems - 1) * PAN - CARD - drawnF - nGroups * 2 * PAN;
  const all: RawStep[] = parts.flatMap((p) => (p.groups ? p.groups.flat() : []));
  const out = (r: number) => all.reduce((a, s) => a + Math.min(TAIL, s.natural) + (s.natural - Math.min(TAIL, s.natural)) / r, 0);
  let lo = 0.05;
  let hi = 40;
  for (let k = 0; k < 60; k++) {
    const m = (lo + hi) / 2;
    if (out(m) > C0) lo = m;
    else hi = m;
  }
  let r = hi;
  let extra = 0;
  if (r < 1) {
    r = 1;
    extra = Math.round(C0 - out(1));
  }
  const ramped: PlayStep[] = all.map((s): PlayStep => {
    const T = Math.min(TAIL, s.natural);
    const body = s.natural - T;
    const headOut = Math.round(body / r);
    const rate = Math.min(4, r);
    const head = r > 4 ? Math.round(headOut * rate) : body;
    return {...s, frames: headOut + T, ramp: {skip: body - head, head, headOut, n: s.natural}};
  });
  // exact fit: put the rounding residue on the last clip's head
  const used = ramped.reduce((a, s) => a + s.frames, 0);
  const res = Math.round(C0 - extra) - used;
  const last = ramped[ramped.length - 1];
  if (last && last.ramp) {
    last.frames += res;
    last.ramp.headOut = Math.max(1, last.ramp.headOut + res);
  }
  // left-over time (slow chapters) is given to the first drawn part
  if (extra > 0) {
    const d = parts.find((p) => p.drawn);
    if (d?.drawn) d.drawn[d.drawn.length - 1][3] += extra;
  }
  const byKey = new Map(ramped.map((s) => [s.clip, s]));
  const items: Item[] = [{kind: 'card', n: plan.card[0], title: plan.card[1], frames: CARD}];
  for (const p of parts) {
    if (p.drawn) items.push({kind: 'drawn', segs: p.drawn, frames: p.drawn.reduce((x, s) => x + s[3], 0)});
    else for (const g of p.groups ?? []) {
      const st = g.map((s) => byKey.get(s.clip)!);
      items.push({kind: 'group', steps: st, frames: st.reduce((a, s) => a + s.frames, 0) + 2 * PAN});
    }
  }
  return {items, rate: r};
};

const Act2Beat: React.FC<{items: Item[]}> = ({items}) => (
  <TransitionSeries>
    {items.map((it, i) => (
      <React.Fragment key={i}>
        {i > 0 ? <TransitionSeries.Transition presentation={pan()} timing={linearTiming({durationInFrames: PAN})} /> : null}
        <TransitionSeries.Sequence durationInFrames={it.frames}>
          {it.kind === 'card' ? <Chapter n={it.n} title={it.title} /> : it.kind === 'drawn' ? <Drawn segs={it.segs} /> : <Group steps={it.steps} pan={PAN} />}
        </TransitionSeries.Sequence>
      </React.Fragment>
    ))}
  </TransitionSeries>
);

/* ------------------------------------------------------------------ */

export type PitchProps = {steps: RawStep[]};

export const Pitch: React.FC<PitchProps> = ({steps}) => {
  let t = 0;
  return (
    <InsertCaptions.Provider value={false}>
      <AbsoluteFill style={{backgroundColor: C.paper}}>
        {PITCH_BEATS.map((b, i) => {
          const B = beatFramesP(i);
          const from = t;
          t += B;
          return (
            <Sequence key={b.n} from={from} durationInFrames={B} name={`${b.n} · ${b.title}`}>
              {b.act === 2 ? <Act2Beat items={buildAct2(b.n, steps, B).items} /> : <Drawn segs={ACT13[b.n]} />}
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </InsertCaptions.Provider>
  );
};

export const loadPitchSteps = async (): Promise<RawStep[]> => {
  const m: Manifest = await fetch(staticFile('demo/manifest.json')).then((r) => r.json());
  let plan: Plan = {};
  try {
    plan = await fetch(staticFile('demo-plan.json')).then((r) => (r.ok ? r.json() : {}));
  } catch {
    plan = {};
  }
  return m.steps.map((s) => {
    const p = plan.steps?.[s.line] ?? {};
    const natural = Math.max(30, Math.round((s.seconds - (p.trimEnd ?? 0)) * 30));
    return {...s, key: s.line, line: p.line ?? s.line, rate: 1, frames: natural, natural, chapter: s.chapter ?? 1};
  });
};

export const calcPitch: CalculateMetadataFunction<PitchProps> = async () => {
  const steps = await loadPitchSteps();
  PITCH_BEATS.forEach((b, i) => {
    if (b.act !== 2) return;
    const {items, rate} = buildAct2(b.n, steps, beatFramesP(i));
    const total = items.reduce((a, it) => a + it.frames, 0) - (items.length - 1) * PAN;
    console.log(`pitch beat ${b.n}: clip speed ${rate.toFixed(2)}x, ${total}/${beatFramesP(i)} frames`);
  });
  return {durationInFrames: PITCH_FRAMES, props: {steps}};
};
