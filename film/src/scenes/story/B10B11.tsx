import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Character, EXPR, POSE, Who, mixPose} from '../../characters/Character';
import {HText, Shot, Wash, Bloom, rectD} from '../../lib/paint';
import {E, kf, ramp, clamp01, lerp} from '../../lib/anim';
import {C} from '../../lib/theme';
import {L, P, R} from '../../lib/rough';
import {Coin, Cup, Fill, Phone, Thread, Title, THIN} from '../../props/kit';
import {BigScreen} from '../../props/big';
import {CafeInterior, Ground, Mountains, Stupa} from '../../props/sets';
import {Cast, MapBackdrop, MapThread} from './ThreadMap';
import {Avatar} from './B5B6';
import {ZCoin, noise3} from '../../lib/tools';

/* ------------------------------------------------------------------ */
/* B10 — How it grows                                                 */
/* ------------------------------------------------------------------ */

export const LinkBubble: React.FC<{x: number; y: number; s?: number; seed: number; rot?: number}> = ({x, y, s = 1, seed, rot = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <Fill d="M -60 -40 L 60 -40 C 72 -40 76 -34 76 -24 L 76 18 C 76 28 70 32 60 32 L -20 32 L -40 52 L -36 32 L -60 32 C -70 32 -76 28 -76 18 L -76 -24 C -76 -34 -70 -40 -60 -40 Z" color={C.cream} op={0.7} seed={seed} f="wcS" knock={C.cream} o={{strokeWidth: 2.6}} />
    <g transform="rotate(-30)">
      <rect x={-34} y={-11} width={40} height={22} rx={11} fill="none" stroke={C.pine} strokeWidth={6} />
      <rect x={-6} y={-11} width={40} height={22} rx={11} fill="none" stroke={C.crimson} strokeWidth={6} />
    </g>
  </g>
);

const fly = (f: number, s: number, d: number, a: [number, number], b: [number, number], h = 160) => {
  const t = ramp(f, s, s + d, E.inOut);
  return {t, x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * h};
};

export const S10_1: React.FC = () => {
  const f = useCurrentFrame();
  const flights = [
    {s: 16, a: [1000, 640] as [number, number], b: [440, 640] as [number, number]},
    {s: 40, a: [1000, 640] as [number, number], b: [1560, 640] as [number, number]},
    {s: 92, a: [440, 640] as [number, number], b: [170, 600] as [number, number]},
  ];
  const got = (k: number) => f > flights[k].s + 30;
  return (
    <Shot
      cam={{x: 900, y: 700, z: kf(f, [[0, 1.22], [180, 1.14]])}}
    >
      <Wash d={rectD(-200, -200, 2400, 1500)} color={C.marigoldTint} op={0.22} f="wcL" />
      <Ground x1={-300} x2={2300} y={1000} seed={1200} color={C.crimsonTint} />
      <Character who="cust2" x={170} y={900} scale={1.0} expr={got(2) ? 'happy' : 'neutral'} pose="phone" frontProp={<Phone x={6} y={-6} s={0.6} seed={1201} glow={got(2) ? 1 : 0} />} />
      <Character who="emma" x={440} y={1000} scale={1.25} expr={got(0) ? 'happy' : 'neutral'} pose="phone" frontProp={<Phone x={6} y={-6} s={0.65} seed={1202} glow={got(0) ? 1 : 0} />} />
      <Character who="rajan" x={960} y={1000} scale={1.35} expr="happy" pose="phoneUp" frontProp={<Phone x={6} y={-6} s={0.7} seed={1203} />} />
      <Character who="cust1" x={1560} y={1000} scale={1.25} facing={-1} expr={got(1) ? 'happy' : 'neutral'} pose="phone" frontProp={<Phone x={6} y={-6} s={0.65} seed={1204} glow={got(1) ? 1 : 0} />} />
      {flights.map((fl, i) => {
        const p = fly(f, fl.s, 30, fl.a, fl.b);
        if (p.t <= 0 || p.t >= 1) return null;
        return <LinkBubble key={i} x={p.x} y={p.y - 120} s={1.1} rot={Math.sin(p.t * Math.PI) * 8} seed={1210 + i} />;
      })}
      {[0, 1, 2].map((i) => (got(i) ? <LinkBubble key={`g${i}`} x={flights[i].b[0] + 60} y={flights[i].b[1] - 220} s={0.7} seed={1220 + i} /> : null))}
    </Shot>
  );
};

const NET: [number, number, number, number, number][] = [
  // ax, bx, arc, start frame, seed
  [190, 1250, 520, 10, 1301],
  [80, 1450, 430, 26, 1302],
  [560, 1080, 260, 42, 1303],
  [410, 1850, 600, 58, 1304],
  [560, 1690, 380, 74, 1305],
  [80, 1080, 320, 90, 1306],
  [190, 1850, 470, 106, 1307],
  [410, 1450, 300, 122, 1308],
];
const NEWBIES: [Who, number, number, number, 1 | -1][] = [
  ['kid2', 1080, 960, 44, -1],
  ['kid1', 1450, 935, 70, -1],
  ['cust2', 560, 950, 96, 1],
  ['kid3', 1850, 950, 120, -1],
  ['cust1', 80, 950, 140, 1],
];

export const S10_2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Shot cam={{x: 960, y: kf(f, [[0, 600], [200, 560]]), z: kf(f, [[0, 1.0], [200, 0.9]])}}>
      <MapBackdrop labels={0} />
      {NET.map(([ax, bx, h, s, seed], i) => {
        // each new thread is thrown loose and settles into the weave (seeded p5 noise)
        const settle = 1 - ramp(f, s, s + 90, E.out);
        const j1 = (noise3(i * 3.1, f * 0.02) - 0.5) * 160 * settle;
        const j2 = (noise3(i * 3.1 + 9, f * 0.02) - 0.5) * 160 * settle;
        return <Thread key={i} d={`M ${ax} 800 C ${ax + 260} ${800 - h + j1} ${bx - 260} ${800 - h + j2} ${bx} 800`} p={ramp(f, s, s + 60, E.inOut)} seed={seed} w={9} />;
      })}
      <MapThread p={1} q={1} />
      <Cast exprs={{emma: 'happy', rajan: 'proud', sita: 'happy', bikash: 'happy'}} rajanPose="wave" />
      {NEWBIES.map(([who, x, y, s, facing], i) => (
        <Character key={i} who={who} x={x} y={y} scale={0.58} facing={facing} expr="happy" draw={ramp(f, s, s + 24)} pose={f > s + 30 ? 'wave' : 'idle'} />
      ))}
    </Shot>
  );
};

/* ------------------------------------------------------------------ */
/* B11 — Close                                                        */
/* ------------------------------------------------------------------ */

const jump = (f: number, s: number) => {
  const t = f - s;
  if (t < 0) return {lift: 0, squash: 0};
  if (t < 8) return {lift: 0, squash: Math.sin((t / 8) * Math.PI) * 0.12};
  if (t < 26) {
    const k = (t - 8) / 18;
    return {lift: Math.sin(k * Math.PI) * 110, squash: -0.08 * Math.sin(k * Math.PI)};
  }
  if (t < 33) return {lift: 0, squash: Math.sin(((t - 26) / 7) * Math.PI) * 0.1};
  return {lift: 0, squash: 0};
};

export const S11_1: React.FC = () => {
  const f = useCurrentFrame();
  const coinY = (s: number) => kf(f, [[s, -100], [s + 20, 560, E.in]]);
  const caught = f > 30;
  const j1 = jump(f, 40);
  const j2 = jump(f, 46);
  const pose = (j: {lift: number; squash: number}) => ({...mixPose(POSE.holdOut, POSE.cheer, ramp(f, 44, 56)), lift: j.lift, squash: j.squash, legs: j.lift > 4 ? ('jump' as const) : ('stand' as const)});
  return (
    <Shot>
      <Wash d={rectD(-100, -100, 1060, 1300)} color={C.marigoldTint} op={0.3} f="wcL" />
      <Wash d={rectD(960, -100, 1060, 1300)} color={C.crimsonTint} op={0.22} f="wcL" />
      <g opacity={0.5}>
        <Mountains x={0} y={760} s={0.5} />
      </g>
      <g opacity={0.6}>
        <Stupa x={1700} y={760} s={0.55} />
      </g>
      <Ground x1={-100} x2={960} y={760} seed={1400} color={C.sage} />
      <Ground x1={960} x2={2100} y={760} seed={1401} />
      <R s={L(960, 40, 960, 1050)} seed={1402} o={{strokeWidth: 4}} />
      {[0, 1].map((k) => {
        const x = k === 0 ? 480 : 1440;
        return !caught || f < 30 ? <ZCoin key={k} x={x + 60} y={coinY(6 + k * 4)} d={70} rotY={f / 3 + k} /> : null;
      })}
      <Character who="sita" x={480} y={1000} scale={1.45} expr={f > 30 ? 'joy' : 'surprised'} pose={pose(j1)} frontProp={caught ? <Coin x={0} y={-24} s={1.3} seed={1405} /> : undefined} />
      <Character who="bikash" x={1440} y={1000} scale={1.45} facing={-1} expr={f > 34 ? 'joy' : 'surprised'} pose={pose(j2)} frontProp={caught ? <Coin x={0} y={-24} s={1.3} seed={1406} /> : undefined} />
    </Shot>
  );
};

export const S11_2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Shot cam={{x: 960, y: 540, z: kf(f, [[0, 1.0], [100, 1.05]])}}>
      <CafeInterior y={800} part="wall" />
      <BigScreen x={700} y={90} w={520} h={300} mode="video" p={1} seed={1500} lw={0.7} />
      <rect x={720} y={364} width={480 * ((f % 100) / 100)} height={6} fill={C.marigold} />
      <Character who="emma" x={1650} y={1110} scale={1.6} facing={-1} expr="joy" pose={{...POSE.idle, legs: 'hidden'}} />
      <CafeInterior y={800} part="counter" cx0={1400} />
      {([
        ['cust1', 360, 1],
        ['kid2', 620, 1],
        ['cust2', 1080, -1],
      ] as [Who, number, 1 | -1][]).map(([who, x, fc], i) => (
        <Character key={i} who={who} x={x} y={1150} scale={1.3} facing={fc} expr={i === 1 ? 'joy' : 'happy'} pose={{...POSE.idle, legs: 'hidden', head: -8}} />
      ))}
      {[480, 1000].map((tx, i) => (
        <g key={tx}>
          <Fill d={rectD(tx - 230, 900, 460, 26, 8)} color={C.marigold} op={0.7} seed={1510 + i} f="wcS" />
          <Fill d={rectD(tx - 200, 926, 400, 200)} color={C.crimson} op={0.25} seed={1512 + i} f="wcS" />
          <Cup x={tx - 80} y={898} s={1} seed={1514 + i} />
          <Cup x={tx + 90} y={898} s={1} seed={1516 + i} />
        </g>
      ))}
    </Shot>
  );
};

export const S11_3: React.FC = () => {
  const f = useCurrentFrame();
  const who: Who[] = ['emma', 'rajan', 'sita', 'bikash'];
  return (
    <Shot>
      <Bloom cx={960} cy={420} rx={760} ry={260} color={C.marigoldTint} op={0.4} />
      <Thread d="M 360 820 C 560 720 760 920 960 820 C 1160 720 1360 920 1560 820" p={ramp(f, 30, 80)} seed={1600} w={16} />
      {who.map((w, i) => (
        <g key={w} opacity={ramp(f, 36 + i * 10, 48 + i * 10)}>
          <Avatar who={w} x={360 + i * 400} y={820} r={64} expr="happy" seed={1601 + i} />
        </g>
      ))}
      <Title x={960} y={400} size={150} t={ramp(f, 0, 36)}>Sajha Kaam</Title>
      <HText x={960} y={560} size={96} anchor="middle" color={C.crimson} reveal={ramp(f, 24, 50)}>
        साझा काम
      </HText>
    </Shot>
  );
};

export const B10_SHOTS: [React.FC, number][] = [
  [S10_1, 170],
  [S10_2, 210],
];
export const B11_SHOTS: [React.FC, number][] = [
  [S11_1, 130],
  [S11_2, 100],
  [S11_3, 120],
];

export {P, THIN, clamp01};
