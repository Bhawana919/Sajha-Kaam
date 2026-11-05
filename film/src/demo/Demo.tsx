import React from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import type {TransitionPresentation, TransitionPresentationComponentProps} from '@remotion/transitions';
import {Character, Who} from '../characters/Character';
import {BoilCtx, L, P, R} from '../lib/rough';
import {Bloom, HText, Shot, Wash, rectD} from '../lib/paint';
import {E, clamp01, kf, ramp} from '../lib/anim';
import {C, DISPLAY} from '../lib/theme';
import {AppMark, Fill, Thread, THIN} from '../props/kit';
import {Shield} from '../scenes/story/B7B8B9';
import {INSERTS} from './Inserts';
import {Item, PlayStep, Section, loadDemo, totalFrames} from './timeline';
import {S11_3} from '../scenes/story/B10B11';
import {Phone} from '../props/kit';

/** Speed ramp: skip `skip` source frames, play `head` source frames in `headOut` output frames, then the tail at 1x. */
export const rampSrc = (r: {skip: number; head: number; headOut: number; n: number}, local: number) =>
  Math.min(r.n - 1, Math.round(local < r.headOut ? r.skip + (local * r.head) / Math.max(1, r.headOut) : r.skip + r.head + (local - r.headOut)));

export type DemoProps = {items: Item[]; pan: number; sections: Section[]; vo: boolean};

/* ------------------------------------------------------------------ */
/* Pan between items: the camera slides along one long paper sheet    */
/* ------------------------------------------------------------------ */

const PanComp: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({children, presentationDirection, presentationProgress}) => {
  const p = E.inOut(presentationProgress);
  const x = presentationDirection === 'exiting' ? -p * 1920 : (1 - p) * 1920;
  return <AbsoluteFill style={{transform: `translateX(${x}px)`}}>{children}</AbsoluteFill>;
};
export const pan = (): TransitionPresentation<Record<string, never>> => ({component: PanComp, props: {}});

/* ------------------------------------------------------------------ */
/* Chapter card                                                       */
/* ------------------------------------------------------------------ */

export const Chapter: React.FC<{n: number; title: string}> = ({n, title}) => {
  const f = useCurrentFrame();
  const tw = title.length * 56;
  const x0 = 960 - (tw + 210) / 2;
  return (
    <Shot>
      <Bloom cx={960} cy={520} rx={700} ry={240} color={C.marigoldTint} op={0.45} />
      <g transform={`translate(${x0 + 80} 520) scale(${E.back(ramp(f, 4, 20))})`}>
        <Fill d="M -80 0 a 80 80 0 1 0 160 0 a 80 80 0 1 0 -160 0 Z" color={C.crimson} op={0.85} seed={3000 + n} f="wcS" knock={C.cream} o={{strokeWidth: 3}} />
        <HText x={0} y={34} size={96} anchor="middle" color={C.cream} font={DISPLAY} weight={800}>
          {String(n)}
        </HText>
      </g>
      <HText x={x0 + 210} y={556} size={110} reveal={ramp(f, 12, 40)}>
        {title}
      </HText>
      <Thread d="M 300 700 C 700 640 1200 760 1620 690" p={ramp(f, 16, 56)} seed={3010 + n} w={16} />
    </Shot>
  );
};

/* ------------------------------------------------------------------ */
/* A phone with a real clip inside                                    */
/* ------------------------------------------------------------------ */

const SCREEN_W = 390;
const SCREEN_H = 844;

/** Balanced wrap: as few lines as fit `max` chars, with the break near the middle. */
const wrap = (s: string, max = 16) => {
  const words = s.split(' ');
  const n = Math.max(1, Math.ceil(s.length / max));
  const target = s.length / n;
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = (cur + ' ' + w).trim();
    if (cur && out.length < n - 1 && (next.length > max || Math.abs(cur.length - target) < Math.abs(next.length - target))) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
};

const KNOWN: Who[] = ['rajan', 'emma', 'sita', 'bikash', 'pemba', 'anusha'];

const Beside: React.FC<{who: string; x: number; y: number; s: number; facing: 1 | -1; active: boolean; draw: number}> = ({who, x, y, s, facing, active, draw}) => {
  const f = useCurrentFrame();
  if (who === 'review') {
    // the Sajha Kaam reviewer is a seal, not a person
    return (
      <g opacity={draw} transform={`translate(${x} ${y - 260 * s}) rotate(${-8 + Math.sin(f / 20) * 2}) scale(${s})`}>
        <Fill d="M -110 0 a 110 110 0 1 0 220 0 a 110 110 0 1 0 -220 0 Z" color={C.crimson} op={0.25} seed={3100} f="wcM" knock={C.cream} o={{stroke: C.crimson, strokeWidth: 5}} />
        <R s={P('M -88 0 a 88 88 0 1 0 176 0 a 88 88 0 1 0 -176 0 Z')} seed={3101} o={{...THIN, stroke: C.crimson, strokeWidth: 3}} />
        <Shield x={0} y={-6} s={2.1} seed={3102} />
        <g transform="translate(0 70)">
          <AppMark x={0} y={0} s={0.8} seed={3103} />
        </g>
      </g>
    );
  }
  const w = (KNOWN as string[]).includes(who) ? (who as Who) : null;
  if (!w) return <g transform={`translate(${x} ${y - 200}) scale(3)`}><AppMark x={0} y={0} seed={3104} /></g>;
  const point = active ? 1 : 0;
  return (
    <Character
      who={w}
      x={x}
      y={y}
      scale={s}
      facing={facing}
      draw={draw}
      expr={active ? 'happy' : 'content'}
      pose={{fa: [10 + 62 * point, 16 - 8 * point], ba: [-8, 14], lean: 0, head: active ? -2 : 4, legs: 'stand', walk: 0, squash: 0, lift: 0}}
    />
  );
};

type PhoneSlot = {cx: number; cy: number; sc: number};

const PhoneFrame: React.FC<{slot: PhoneSlot; draw: number; seed: number; dim: number}> = ({slot, draw, seed, dim}) => {
  const w = SCREEN_W * slot.sc;
  const h = SCREEN_H * slot.sc;
  const x = slot.cx - w / 2;
  const y = slot.cy - h / 2;
  return (
    <g>
      <ellipse cx={slot.cx + 20} cy={y + h + 50} rx={w * 0.7} ry={22} fill={C.ink} opacity={0.08} />
      <Fill d={rectD(x - 22, y - 30, w + 44, h + 60, 52 * slot.sc)} color={C.ink} op={0.8} seed={seed} f="wcM" draw={draw} o={{strokeWidth: 3.4}} />
      <rect x={slot.cx - 40} y={y - 20} width={80} height={10} rx={5} fill={C.paper} opacity={0.35 * draw} />
      {dim > 0 ? null : null}
    </g>
  );
};

export const Group: React.FC<{steps: PlayStep[]; pan: number}> = ({steps, pan}) => {
  const f = useCurrentFrame();
  const pair = steps.length === 2;
  const slots: PhoneSlot[] = pair
    ? [
        {cx: 650, cy: 548, sc: 0.92},
        {cx: 1270, cy: 548, sc: 0.92},
      ]
    : [{cx: 1080, cy: 540, sc: 1}];
  // when each clip plays
  let acc = pan;
  const windows = steps.map((s) => {
    const w = {start: acc, end: acc + s.frames};
    acc += s.frames;
    return w;
  });
  const activeIdx = windows.findIndex((w) => f >= w.start && f < w.end);
  const draw = ramp(f, 0, 16, E.soft);
  const beside = pair
    ? [
        {x: 250, y: 1010, s: 1.12, facing: 1 as const},
        {x: 1670, y: 1010, s: 1.12, facing: -1 as const},
      ]
    : [{x: 520, y: 1010, s: 1.5, facing: 1 as const}];
  const lineX = pair ? [250, 1670] : [520];
  return (
    <AbsoluteFill>
      <Shot>
        <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.18} f="wcL" />
        <Wash d={rectD(-100, 1010, 2200, 300)} color={C.crimsonTint} op={0.25} f="wcL" />
        <R s={L(-100, 1010, 2100, 1010)} seed={3200} o={THIN} opacity={0.5} />
        {slots.map((sl, i) => (
          <Bloom key={i} cx={sl.cx} cy={sl.cy} rx={320 * sl.sc} ry={480 * sl.sc} color={C.marigoldTint} op={(activeIdx === i || !pair ? 0.5 : 0.2) * draw} />
        ))}
        {steps.map((s, i) => (
          <Beside key={s.clip} who={s.who} {...beside[i]} active={activeIdx === i || (!pair && true)} draw={draw} />
        ))}
        {steps.map((s, i) => {
          // auto-fit: wrap into at most 3 lines inside a fixed box, shrinking the type if needed
          const boxW = pair ? 380 : 620;
          const base = pair ? 54 : 64;
          const cw = 0.6; // average Figtree glyph width per em (stars count wider)
          const em = (t: string) => [...t].reduce((a, ch) => a + (ch === '★' ? 1.05 : /[A-Z]/.test(ch) ? 0.68 : cw), 0);
          let size = base;
          let lines = wrap(s.line, Math.max(6, Math.floor(boxW / (base * cw))));
          while (lines.length > 3 || Math.max(...lines.map(em)) * size > boxW) {
            size -= 2;
            lines = wrap(s.line, Math.max(6, Math.floor(boxW / (size * cw))));
            if (size < 30) break;
          }
          const t = ramp(f, Math.max(8, windows[i].start - 10), Math.max(30, windows[i].start + 14));
          return (
            <g key={`l${i}`} opacity={pair && activeIdx !== i && activeIdx !== -1 ? 0.45 : 1}>
              {lines.map((ln, k) => (
                <HText key={k} x={lineX[i]} y={170 + k * size * 1.15 + (pair ? 0 : 40)} size={size} anchor="middle" reveal={clamp01(t * lines.length - k)}>
                  {ln}
                </HText>
              ))}
            </g>
          );
        })}
        {slots.map((sl, i) => (
          <PhoneFrame key={i} slot={sl} draw={draw} seed={3210 + i * 5} dim={0} />
        ))}
      </Shot>
      {steps.map((s, i) => {
        const sl = slots[i];
        const w = SCREEN_W * sl.sc;
        const h = SCREEN_H * sl.sc;
        const local = Math.max(0, Math.min(s.frames - 1, f - windows[i].start));
        const inactive = pair && activeIdx !== i;
        return (
          <div
            key={s.clip}
            style={{
              position: 'absolute',
              left: sl.cx - w / 2,
              top: sl.cy - h / 2,
              width: w,
              height: h,
              borderRadius: 30 * sl.sc,
              overflow: 'hidden',
              opacity: ramp(f, 8, 18),
              background: C.cream,
            }}
          >
            <Freeze frame={s.ramp ? rampSrc(s.ramp, local) : local}>
              <OffthreadVideo src={staticFile(s.clip)} muted playbackRate={s.ramp ? 1 : s.rate} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            </Freeze>
            {inactive ? <AbsoluteFill style={{background: C.paper, opacity: 0.45}} /> : null}
          </div>
        );
      })}
      <BoilCtx.Provider value={Math.floor(f / 4) % 3}>
        <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
          {slots.map((sl, i) => {
            const w = SCREEN_W * sl.sc;
            const h = SCREEN_H * sl.sc;
            return <R key={i} s={P(rectD(sl.cx - w / 2, sl.cy - h / 2, w, h, 30 * sl.sc))} seed={3230 + i} o={{...THIN, strokeWidth: 2.6}} draw={draw} />;
          })}
          {pair && activeIdx >= 0 ? (
            <path
              d={`M ${slots[activeIdx].cx - 60} ${1040} L ${slots[activeIdx].cx} ${1012 + Math.sin(f / 6) * 3} L ${slots[activeIdx].cx + 60} ${1040}`}
              stroke={C.crimson}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </svg>
      </BoilCtx.Provider>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */

/** Opening card: the four people, each with their phone. */
const IntroCard: React.FC = () => {
  const f = useCurrentFrame();
  const cast: [Who, number][] = [
    ['rajan', 420],
    ['emma', 800],
    ['sita', 1180],
    ['bikash', 1560],
  ];
  return (
    <Shot>
      <Bloom cx={960} cy={300} rx={700} ry={200} color={C.marigoldTint} op={0.45} />
      <HText x={960} y={250} size={120} anchor="middle" font={DISPLAY} weight={800} reveal={ramp(f, 6, 40)}>
        Sajha Kaam
      </HText>
      <Thread d="M 260 330 C 700 290 1220 370 1660 320" p={ramp(f, 20, 60)} seed={3300} w={14} />
      {cast.map(([w, x], i) => (
        <Character
          key={w}
          who={w}
          x={x}
          y={1000}
          scale={1.25}
          facing={i < 2 ? 1 : -1}
          draw={ramp(f, 30 + i * 10, 52 + i * 10)}
          expr="happy"
          pose="phoneUp"
          frontProp={<Phone x={6} y={-6} s={0.7} seed={3310 + i} glow={ramp(f, 70 + i * 8, 90 + i * 8)} />}
        />
      ))}
    </Shot>
  );
};

export const Demo: React.FC<DemoProps> = ({items, pan: p, sections, vo}) => {
  if (!items || items.length === 0) {
    return <Shot><HText x={960} y={540} size={60} anchor="middle">Demo clips go here</HText></Shot>;
  }
  return (
    <AbsoluteFill style={{backgroundColor: C.paper}}>
      <TransitionSeries>
        {items.map((it, i) => {
          const Ins = it.kind === 'insert' ? INSERTS[it.insert] : null;
          return (
            <React.Fragment key={i}>
              {i > 0 ? <TransitionSeries.Transition presentation={pan()} timing={linearTiming({durationInFrames: p})} /> : null}
              <TransitionSeries.Sequence durationInFrames={it.frames}>
                {it.kind === 'card' ? (it.card === 'intro' ? <IntroCard /> : <S11_3 />) : it.kind === 'chapter' ? <Chapter n={it.n} title={it.title} /> : it.kind === 'group' ? <Group steps={it.steps} pan={p} /> : Ins ? <Ins /> : null}
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>
      {/* narration: each section's slice of demo.m4a starts with its section, so the voice stays in sync */}
      {vo
        ? (sections ?? []).map((s) =>
            s.voFrames > 0 ? (
              <Sequence key={s.section} from={s.start} durationInFrames={Math.min(s.frames, s.voFrames)}>
                <Audio src={staticFile('vo/demo.m4a')} startFrom={s.voStart} endAt={s.voStart + s.voFrames} />
              </Sequence>
            ) : null,
          )
        : null}
    </AbsoluteFill>
  );
};

export const calcDemo: CalculateMetadataFunction<DemoProps> = async () => {
  const {items, pan, sections, vo} = await loadDemo();
  return {durationInFrames: Math.max(30, totalFrames(items, pan)), props: {items, pan, sections, vo}};
};

export {kf};
