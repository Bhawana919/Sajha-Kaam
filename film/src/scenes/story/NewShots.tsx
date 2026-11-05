import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Character, EXPR, POSE, Who, mixExpr, mixPose} from '../../characters/Character';
import {Bloom, HText, Shot, Wash, rectD, ellD} from '../../lib/paint';
import {E, act, kf, ramp, lerp, hn, clamp01} from '../../lib/anim';
import {C, DISPLAY, SKIN} from '../../lib/theme';
import {L, P, R} from '../../lib/rough';
import {Cup, Fill, Laptop, BlankPage, SitePage, Stars, Thread, THIN, OUT} from '../../props/kit';
import {BigPhone, HoldingHand} from '../../props/big';
import {CafeInterior, Ground, Mountains, Stupa, House} from '../../props/sets';
import {Avatar, Stamp} from './B5B6';
import {DhakaBand} from '../../lib/tools';

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */

/** A sketched passenger plane, side view, facing right. Origin = centre. */
export const Plane: React.FC<{x: number; y: number; s?: number; rot?: number; seed: number; cargo?: boolean}> = ({x, y, s = 1, rot = 0, seed, cargo}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <Fill d="M -40 -40 L -10 -40 L 40 0 L -20 0 Z" color={C.crimson} op={0.85} seed={seed} f="wcS" />
    <Fill d="M -190 -10 C -200 -40 -170 -50 -150 -50 L 150 -50 C 200 -50 230 -30 230 -10 C 230 10 200 20 150 20 L -150 20 C -180 20 -190 10 -190 -10 Z" color={C.cream} op={0.6} seed={seed + 1} f="wcS" knock={C.cream} />
    <Fill d="M -170 -50 L -210 -120 L -170 -120 L -120 -50 Z" color={C.crimson} op={0.85} seed={seed + 2} f="wcS" />
    <Fill d="M -20 0 L 60 0 L -40 80 L -80 80 Z" color={C.pine} op={0.75} seed={seed + 3} f="wcS" />
    {Array.from({length: 8}).map((_, i) => (
      <circle key={i} cx={-120 + i * 34} cy={-24} r={7} fill={C.pineTint} stroke={C.ink} strokeWidth={1.6} />
    ))}
    <path d="M 190 -34 C 205 -34 214 -26 218 -16 L 196 -16 Z" fill={C.pine} opacity={0.8} />
    <rect x={-190} y={-8} width={420} height={6} fill={C.marigold} opacity={0.8} />
    {cargo ? <path d="M -60 -50 L -30 -50 L -45 -62 Z" fill={C.marigold} /> : null}
  </g>
);

/** A work parcel / folder. */
export const Folder: React.FC<{x: number; y: number; s?: number; rot?: number; seed: number; color?: string}> = ({x, y, s = 1, rot = 0, seed, color = C.marigold}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <Fill d="M -34 -22 L -10 -22 L -4 -30 L 14 -30 L 20 -22 L 34 -22 L 34 24 L -34 24 Z" color={color} op={0.9} seed={seed} f="wcS" o={{strokeWidth: 2.2}} />
    <R s={L(-24, 0, 24, 0)} seed={seed + 1} o={THIN} opacity={0.6} />
    <R s={L(-24, 10, 14, 10)} seed={seed + 2} o={THIN} opacity={0.6} />
  </g>
);

const Suitcase = (seed: number, col: string) => (
  <g>
    <R s={L(0, 0, 0, 30)} seed={seed} o={{...THIN, strokeWidth: 3}} />
    <Fill d={rectD(-26, 30, 52, 70, 8)} color={col} op={0.8} seed={seed + 1} f="wcS" o={{strokeWidth: 2.2}} />
    <circle cx={-16} cy={104} r={5} fill={C.ink} />
    <circle cx={16} cy={104} r={5} fill={C.ink} />
  </g>
);

/* ------------------------------------------------------------------ */
/* 1 · The gap — the departure gate                                   */
/* ------------------------------------------------------------------ */

export const SDeparture: React.FC = () => {
  const f = useCurrentFrame();
  const people: [Who, number, string][] = [
    ['kid1', 0, C.crimson],
    ['kid2', 1, C.pine],
    ['kid3', 2, C.marigold],
    ['cust2', 3, C.inkSoft],
    ['kid1', 4, C.crimsonTint],
  ];
  const walk = (i: number) => clamp01((f - i * 6) / 150);
  const takeoff = ramp(f, 70, 150, E.in);
  const count = Math.round(ramp(f, 50, 130, E.out) * 200000);
  return (
    <Shot
      cam={{x: kf(f, [[0, 920], [170, 1000]]), y: 540, z: 1}}
      overlay={
        <g opacity={ramp(f, 46, 60)}>
          <HText x={1500} y={98} size={84} anchor="end" font={DISPLAY} weight={800} color={C.crimson}>
            {count.toLocaleString('en-US')}
          </HText>
          <HText x={1520} y={98} size={40} color={C.inkSoft}>
            / year
          </HText>
        </g>
      }
    >
      {/* the big gate window and the runway beyond */}
      <Fill d={rectD(120, 120, 1680, 520, 18)} color={C.pineTint} op={0.25} seed={2500} f="wcL" knock={C.cream} />
      {[540, 960, 1380].map((x) => (
        <R key={x} s={L(x, 120, x, 640)} seed={2501 + x} o={THIN} opacity={0.7} />
      ))}
      <g opacity={0.6}>
        <Mountains x={160} y={600} s={0.45} />
      </g>
      <R s={L(140, 600, 1780, 600)} seed={2505} o={THIN} opacity={0.6} />
      <Plane x={lerp(700, 2300, takeoff)} y={kf(f, [[70, 560], [150, 260, E.in]])} rot={-14 * ramp(f, 80, 120)} s={0.9} seed={2510} />
      {/* floor and the queue walking out to the gate */}
      <Ground x1={-300} x2={2300} y={760} seed={2520} color={C.lineStrong} />
      {people.map(([who, i, col]) => {
        const x = 220 + i * 190 + walk(i) * 760;
        return (
          <Character
            key={i}
            who={who}
            x={x}
            y={1010}
            scale={1.05}
            expr={i === 2 ? 'sad' : 'worried'}
            pose={{...POSE.idle, fa: [8, 4], legs: 'walk', walk: f * 0.3 + i, head: 10}}
            frontProp={Suitcase(2530 + i * 3, col)}
          />
        );
      })}
    </Shot>
  );
};

/* ------------------------------------------------------------------ */
/* 2 · The other side — Emma hands Rajan his coffee                   */
/* ------------------------------------------------------------------ */

export const SCoffee: React.FC = () => {
  const f = useCurrentFrame();
  const hand = act(f, 4, 22, 0, 1);
  const given = f > 30;
  const point = act(f, 46, 18, 0, 1);
  const smile = ramp(f, 14, 26);
  return (
    <Shot cam={{x: 960, y: 540, z: kf(f, [[0, 1], [110, 1.04]])}}>
      <CafeInterior y={760} part="wall" />
      <Character
        who="emma"
        x={1330}
        y={1015}
        scale={1.5}
        facing={-1}
        expr={mixExpr(EXPR.content, EXPR.happy, smile)}
        talk={f > 50 && f < 100 ? 1 : 0}
        pose={{...(given ? mixPose(POSE.idle, POSE.point, point) : mixPose(POSE.idle, POSE.holdOut, hand)), legs: 'hidden', head: -3}}
        frontProp={!given ? <Cup x={0} y={8} s={0.9} seed={2600} /> : undefined}
      />
      <Character
        who="rajan"
        x={640}
        y={1070}
        scale={1.5}
        expr={mixExpr(EXPR.content, EXPR.happy, smile)}
        pose={given ? POSE.cup : mixPose(POSE.idle, POSE.holdOut, ramp(f, 12, 28))}
        frontProp={given ? <Cup x={0} y={8} s={0.9} seed={2601} /> : undefined}
      />
      <CafeInterior y={760} part="counter" cx0={860} />
      <Laptop x={1060} y={752} s={1.05} seed={2602} screen={<BlankPage seed={2603} />} />
      {/* a small warm heart of trust between them */}
      <g opacity={ramp(f, 26, 36) * (1 - ramp(f, 60, 74))} transform={`translate(980 ${420 - ramp(f, 26, 74) * 60})`}>
        <path d="M 0 18 C -30 -6 -18 -30 0 -14 C 18 -30 30 -6 0 18 Z" fill={C.crimson} stroke={C.ink} strokeWidth={2.4} />
      </g>
    </Shot>
  );
};

/* ------------------------------------------------------------------ */
/* 7 · The team — notification, share card, ask to join, approval     */
/* ------------------------------------------------------------------ */

const ShareScreen: React.FC<{sx: number; sy: number; sw: number; sh: number; tap: number; seed: number}> = ({sx, sy, sw, sh, tap, seed}) => {
  const done = tap > 0.5;
  const sq = tap > 0 && tap < 1 ? 1 - Math.sin(tap * Math.PI) * 0.08 : 1;
  return (
    <g>
      <Fill d={rectD(sx + 24, sy + 90, sw - 48, 300, 20)} color={C.marigoldTint} op={0.9} seed={seed} f="wcS" knock={C.cream} o={{strokeWidth: 2.2}} />
      <Stars x={sx + 70} y={sy + 150} n={1} size={44} seed={seed + 1} />
      <HText x={sx + sw / 2} y={sy + 300} size={110} anchor="middle" font={DISPLAY} weight={800} color={C.crimson}>
        50%
      </HText>
      <g transform={`translate(${sx + sw / 2} ${sy + sh * 0.8}) scale(${sq}) translate(${-(sx + sw / 2)} ${-(sy + sh * 0.8)})`}>
        <Fill d={rectD(sx + 34, sy + sh * 0.74, sw - 68, 84, 42)} color={done ? C.pine : C.crimson} op={0.92} seed={seed + 2} f="wcS" />
        <HText x={sx + sw / 2} y={sy + sh * 0.74 + 56} size={42} anchor="middle" color={C.cream}>
          {done ? '✓' : 'Ask to join'}
        </HText>
      </g>
    </g>
  );
};

export const STeam: React.FC = () => {
  const f = useCurrentFrame();
  const stamp = ramp(f, 120, 140, E.linear);
  const rajanIn = ramp(f, 86, 104, E.out);
  return (
    <Shot>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.crimsonTint} op={0.12} f="wcL" />
      {[
        {x: 300, who: 'sita' as Who, t: ramp(f, 30, 46), seed: 2700, ax: 160},
        {x: 1220, who: 'bikash' as Who, t: ramp(f, 50, 66), seed: 2720, ax: 1760},
      ].map((p) => (
        <g key={p.who}>
          <BigPhone x={p.x} y={150} w={400} h={780} seed={p.seed}>
            {(sx, sy, sw, sh) => <ShareScreen sx={sx} sy={sy} sw={sw} sh={sh} tap={p.t} seed={p.seed + 5} />}
          </BigPhone>
          <Avatar who={p.who} x={p.ax} y={250} r={90} expr={f > 130 ? 'joy' : p.t > 0.5 ? 'hopeful' : 'happy'} seed={p.seed + 10} />
        </g>
      ))}
      <g opacity={rajanIn} transform={`translate(0 ${(1 - rajanIn) * 60})`}>
        <Avatar who="rajan" x={960} y={300} r={110} expr={f > 128 ? 'proud' : 'content'} seed={2740} />
      </g>
      <Stamp x={960} y={640} t={stamp} text="✓" seed={2741} size={160} rot={-6} />
    </Shot>
  );
};

/* ------------------------------------------------------------------ */
/* 13 · Opportunity comes home                                        */
/* ------------------------------------------------------------------ */

const NET_HOME = [
  'M -200 300 C 300 120 800 160 520 760',
  'M -200 420 C 400 220 1100 200 1420 760',
  'M -200 180 C 500 60 1300 120 980 700',
  'M -200 520 C 300 420 700 420 760 760',
];

export const SHome: React.FC = () => {
  const f = useCurrentFrame();
  const fly = ramp(f, 20, 120, E.inOut);
  const drop = (i: number) => ramp(f, 70 + i * 14, 120 + i * 14, E.in);
  const e = f > 120 ? EXPR.joy : EXPR.determined;
  return (
    <Shot cam={{x: 960, y: 540, z: kf(f, [[0, 1.0], [200, 1.05]])}}>
      <Bloom cx={960} cy={260} rx={1100} ry={260} color={C.honeyLight} op={0.5 * ramp(f, 0, 60)} />
      <g opacity={0.7}>
        <Mountains x={-40} y={760} s={0.62} />
      </g>
      <Stupa x={1640} y={760} s={0.5} />
      <Ground x1={-200} x2={2200} y={760} seed={2800} color={C.sage} />
      {/* the net glows over Nepal */}
      {NET_HOME.map((d, i) => (
        <DhakaBand key={i} d={d} p={ramp(f, i * 10, 70 + i * 10, E.inOut)} w={10} seed={i} />
      ))}
      {/* a plane flies IN, carrying work */}
      <Plane x={lerp(-300, 2300, fly)} y={kf(f, [[20, 150], [120, 230]])} rot={4} s={0.7} seed={2810} cargo />
      {[0, 1, 2].map((i) => {
        const t = drop(i);
        if (t <= 0) return null;
        const tx = i === 1 ? 1340 : 560 + i * 40;
        const sx = lerp(-300, 2300, ramp(70 + i * 14, 20, 120, E.inOut));
        return <Folder key={i} x={lerp(sx, tx, t)} y={lerp(220, 700, t)} rot={(1 - t) * 30} s={1.1} seed={2820 + i} color={[C.marigold, C.crimsonTint, C.pineTint][i]} />;
      })}
      {/* at home, working for the world */}
      <Character who="sita" x={560} y={1060} scale={1.35} facing={1} expr={e} pose={{...POSE.typing, legs: 'hidden'}} />
      <Character who="bikash" x={1360} y={1060} scale={1.35} facing={-1} expr={e} pose={{...POSE.typing, legs: 'hidden'}} />
      <Fill d={rectD(300, 840, 560, 30, 8)} color={C.marigold} op={0.6} seed={2830} f="wcS" />
      <Fill d={rectD(1060, 840, 560, 30, 8)} color={C.marigold} op={0.6} seed={2831} f="wcS" />
      <Fill d={rectD(320, 870, 520, 240)} color={C.crimsonSoft} op={0.5} seed={2832} f="wcS" />
      <Fill d={rectD(1080, 870, 520, 240)} color={C.crimsonSoft} op={0.5} seed={2833} f="wcS" />
      <Laptop x={740} y={842} s={0.9} seed={2834} screen={<SitePage seed={2835} p={1} />} />
      <Laptop x={1150} y={842} s={0.9} seed={2836} screen={<SitePage seed={2837} p={1} video />} />
    </Shot>
  );
};

export {Rc} from '../../lib/rough';
export {House, Thread, HoldingHand, SKIN, hn, OUT, ellD, P};
