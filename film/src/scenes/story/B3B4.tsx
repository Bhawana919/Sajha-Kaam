import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Character, EXPR, POSE, mixExpr, mixPose} from '../../characters/Character';
import {HText, Shot, Wash, Bloom, rectD, ellD} from '../../lib/paint';
import {E, act, kf, ramp, clamp01, hn} from '../../lib/anim';
import {C, SKIN} from '../../lib/theme';
import {L, P, R, Rc} from '../../lib/rough';
import {Coin, DhakaSwatch, Fill, Phone, SitePage, SpeechBubble, THIN, OUT, AppMark} from '../../props/kit';
import {BigPhone, HoldingHand} from '../../props/big';

/* ------------------------------------------------------------------ */
/* Shared props                                                       */
/* ------------------------------------------------------------------ */

export const CheckBox: React.FC<{x: number; y: number; s?: number; t: number; seed: number}> = ({x, y, s = 1, t, seed}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <R s={Rc(-14, -14, 28, 28)} seed={seed} o={{...THIN, strokeWidth: 2.4}} />
    {t > 0 ? <R s={P('M -10 0 L -2 9 L 16 -16')} seed={seed + 1} o={{...THIN, stroke: C.pine, strokeWidth: 5}} draw={t} /> : null}
  </g>
);

export const Tick: React.FC<{x: number; y: number; s?: number; t: number; seed: number; color?: string}> = ({x, y, s = 1, t, seed, color = C.pine}) =>
  t > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <R s={P('M -40 0 L -12 30 L 46 -40')} seed={seed} o={{...THIN, stroke: color, strokeWidth: 12, roughness: 0.6}} draw={t} />
    </g>
  ) : null;

export const Padlock: React.FC<{x: number; y: number; s?: number; closed: number; seed: number}> = ({x, y, s = 1, closed, seed}) => {
  const lift = (1 - closed) * 26;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={`M -30 ${-10 - lift} L -30 ${-50 - lift} C -30 ${-90 - lift} 30 ${-90 - lift} 30 ${-50 - lift} L 30 ${-10 - lift * 0.2}`} stroke={C.ink} strokeWidth={13} fill="none" strokeLinecap="round" />
      <path d={`M -30 ${-10 - lift} L -30 ${-50 - lift} C -30 ${-90 - lift} 30 ${-90 - lift} 30 ${-50 - lift} L 30 ${-10 - lift * 0.2}`} stroke={C.inkSoft} strokeWidth={6} fill="none" strokeLinecap="round" />
      <Fill d={rectD(-50, -16, 100, 82, 12)} color={C.marigold} op={0.95} seed={seed} f="wcS" knock={C.marigoldTint} o={{strokeWidth: 3}} />
      <circle cx={0} cy={20} r={9} fill={C.ink} />
      <rect x={-3} y={22} width={6} height={22} fill={C.ink} />
    </g>
  );
};

/** Glass jar. Origin = bottom centre. */
export const Jar: React.FC<{x: number; y: number; s?: number; seed: number; lid?: number; coins?: number; lock?: number; open?: number}> = ({x, y, s = 1, seed, lid = 1, coins = 0, lock = 0, open = 0}) => {
  const body = 'M -130 -330 C -150 -300 -150 -280 -140 -250 C -160 -170 -160 -60 -130 -10 C -100 6 100 6 130 -10 C 160 -60 160 -170 140 -250 C 150 -280 150 -300 130 -330 Z';
  const lidY = -330 - (1 - lid) * 260 - open * 230;
  const lidR = open * 16;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={6} rx={170} ry={22} fill={C.ink} opacity={0.1} />
      <path d={body} fill={C.cream} opacity={0.7} />
      {/* coin pile */}
      {Array.from({length: Math.floor(coins)}).map((_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        return <Coin key={i} x={-75 + col * 50 + (row % 2) * 24 + hn(i) * 6} y={-40 - row * 34} s={0.9} seed={seed + 40 + i} />;
      })}
      <Wash d={body} color={C.pineTint} op={0.35} f="wcM" />
      <R s={P(body)} seed={seed} o={{...OUT, strokeWidth: 3}} />
      <R s={P('M -100 -260 C -116 -180 -116 -100 -96 -40')} seed={seed + 1} o={{...THIN, stroke: C.cream, strokeWidth: 6}} />
      <g transform={`rotate(${lidR} 0 ${lidY})`} opacity={lid < 0 ? 0 : 1}>
        <Fill d={rectD(-150, lidY - 46, 300, 50, 14)} color={C.marigold} op={0.9} seed={seed + 2} f="wcS" o={{strokeWidth: 3}} />
      </g>
      {lock > 0 ? <Padlock x={0} y={-150} s={0.95} closed={lock} seed={seed + 3} /> : null}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* B3 — Agreement                                                     */
/* ------------------------------------------------------------------ */

const ContractSheet: React.FC<{f: number}> = ({f}) => {
  const row = (i: number) => ramp(f, 20 + i * 28, 44 + i * 28);
  const Y = [250, 440, 630, 820];
  return (
    <g transform="rotate(-1 960 540)">
      <Fill d={rectD(600, 80, 720, 920, 6)} color={C.cream} op={0.85} seed={500} f="wcM" knock={C.cream} />
      <DhakaSwatch x={600} y={80} w={720} h={26} seed={501} />
      <AppMark x={960} y={150} s={1.1} seed={502} />
      {/* placeholder writing on every row: it reads as a real agreement without words */}
      {Y.map((y, i) => (
        <g key={`w${i}`} opacity={row(i)}>
          <R s={L(920, y - 50, 1240 - (i % 2) * 60, y - 50)} seed={505 + i * 3} o={{...THIN, strokeWidth: 5}} opacity={0.75} />
          <R s={L(920, y - 18, 1200 - (i % 3) * 40, y - 18)} seed={506 + i * 3} o={THIN} opacity={0.45} />
          <R s={L(920, y + 8, 1140 + (i % 2) * 60, y + 8)} seed={507 + i * 3} o={THIN} opacity={0.45} />
        </g>
      ))}
      {/* row 1 — deliver */}
      <g opacity={row(0)}>
        <g transform={`translate(650 ${Y[0] - 62}) scale(0.62)`}>
          <SitePage seed={503} p={1} />
        </g>
        <Fill d={rectD(790, Y[0] - 52, 80, 56, 6)} color={C.pine} op={0.75} seed={504} f="wcS" />
        <path d={`M 820 ${Y[0] - 36} L 846 ${Y[0] - 24} L 820 ${Y[0] - 12} Z`} fill={C.cream} />
      </g>
      {/* row 2 — done when */}
      <g opacity={row(1)}>
        {[0, 1, 2].map((k) => (
          <g key={k}>
            <CheckBox x={680} y={Y[1] - 74 + k * 44} s={0.9} t={ramp(f, 130 + k * 14, 142 + k * 14)} seed={510 + k * 3} />
            <R s={L(708, Y[1] - 74 + k * 44, 860 - k * 20, Y[1] - 74 + k * 44)} seed={520 + k} o={THIN} opacity={0.6} />
          </g>
        ))}
      </g>
      {/* row 3 — deadline */}
      <g opacity={row(2)}>
        <Fill d={rectD(660, Y[2] - 92, 150, 120, 8)} color={C.cream} op={0.6} seed={530} f="wcS" />
        <Fill d={rectD(660, Y[2] - 92, 150, 30, 8)} color={C.crimson} op={0.8} seed={531} f="wcS" />
        {Array.from({length: 8}).map((_, k) => (
          <circle key={k} cx={684 + (k % 4) * 34} cy={Y[2] - 40 + Math.floor(k / 4) * 34} r={4} fill={C.inkSoft} />
        ))}
        <R s={{t: 'ellipse', x: 786, y: Y[2] - 6, w: 40, h: 34}} seed={532} o={{...THIN, stroke: C.crimson, strokeWidth: 4}} draw={ramp(f, 110, 125)} />
      </g>
      {/* row 4 — budget */}
      <g opacity={row(3)}>
        <Coin x={720} y={Y[3] - 44} s={1.5} seed={540} />
        <Coin x={770} y={Y[3] - 30} s={1.2} seed={541} />
      </g>
    </g>
  );
};

export const S3_1: React.FC = () => {
  const f = useCurrentFrame();
  const e = mixExpr(EXPR.thinking, EXPR.content, ramp(f, 150, 175));
  return (
    <Shot cam={{x: 960, y: 540, z: kf(f, [[0, 0.98], [240, 1.03]])}}>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.25} f="wcL" />
      <ContractSheet f={f} />
      <Character who="emma" x={300} y={1060} scale={1.4} expr={{...e, lookX: 0.8, lookY: -0.2}} pose="phone" frontProp={<Phone x={6} y={-6} s={0.7} seed={550} />} />
      <Character who="rajan" x={1630} y={1060} scale={1.4} facing={-1} expr={{...e, lookX: 0.8, lookY: -0.2}} pose="phone" frontProp={<Phone x={6} y={-6} s={0.7} seed={551} />} />
    </Shot>
  );
};

const AgreeScreen: React.FC<{sx: number; sy: number; sw: number; sh: number; tap: number; seed: number}> = ({sx, sy, sw, sh, tap, seed}) => {
  const done = tap > 0.5;
  const bw = sw * 0.78;
  const bx = sx + (sw - bw) / 2;
  const by = sy + sh * 0.72;
  const sq = tap > 0 && tap < 1 ? 1 - Math.sin(tap * Math.PI) * 0.08 : 1;
  return (
    <g>
      {[0, 1, 2, 3, 4].map((k) => (
        <R key={k} s={L(sx + 30, sy + 70 + k * 46, sx + sw - 40 - (k % 2) * 60, sy + 70 + k * 46)} seed={seed + k} o={{...THIN, strokeWidth: 3}} opacity={0.5} />
      ))}
      {[0, 1, 2].map((k) => (
        <CheckBox key={k} x={sx + 44} y={sy + 330 + k * 44} s={0.8} t={1} seed={seed + 10 + k * 3} />
      ))}
      <g transform={`translate(${sx + sw / 2} ${by + 40}) scale(${sq}) translate(${-(sx + sw / 2)} ${-(by + 40)})`}>
        <Fill d={rectD(bx, by, bw, 80, 40)} color={done ? C.pine : C.crimson} op={0.9} seed={seed + 20} f="wcS" />
        <HText x={sx + sw / 2 - (done ? 20 : 0)} y={by + 56} size={50} anchor="middle" color={C.cream}>
          Agree
        </HText>
        {done ? <R s={P(`M ${bx + bw - 70} ${by + 40} L ${bx + bw - 56} ${by + 56} L ${bx + bw - 30} ${by + 24}`)} seed={seed + 21} o={{...THIN, stroke: C.cream, strokeWidth: 6}} draw={ramp(tap, 0.5, 1)} /> : null}
      </g>
    </g>
  );
};

const Thumb: React.FC<{x: number; y: number; t: number; skin: string; flip?: boolean}> = ({x, y, t, skin, flip}) => {
  const yy = kf(t, [[0, 500], [0.45, 0, E.out], [0.6, 8], [1, 500, E.in]]);
  if (t <= 0 || t >= 1) return null;
  return (
    <g transform={`translate(${x} ${y + yy}) rotate(${flip ? 12 : -12})`}>
      <path d="M -30 0 C -30 -44 30 -44 30 0 L 34 260 L -34 260 Z" fill={skin} stroke={C.ink} strokeWidth={3} />
      <path d="M -16 -16 C -10 -26 10 -26 16 -16" stroke={C.ink} strokeWidth={2} fill="none" opacity={0.6} />
    </g>
  );
};

export const S3_2: React.FC = () => {
  const f = useCurrentFrame();
  const tapL = ramp(f, 20, 50, E.linear);
  const tapR = ramp(f, 52, 82, E.linear);
  const lockDrop = kf(f, [[96, -300], [118, 560, E.in]]);
  const sq = f > 118 && f < 130 ? Math.sin(((f - 118) / 12) * Math.PI) * 0.14 : 0;
  const closed = ramp(f, 126, 136, E.out);
  const glow = ramp(f, 136, 160);
  return (
    <Shot>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.25} f="wcL" />
      <BigPhone x={240} y={170} w={380} h={720} seed={560} rot={-5}>
        {(sx, sy, sw, sh) => <AgreeScreen sx={sx} sy={sy} sw={sw} sh={sh} tap={ramp(f, 28, 44)} seed={561} />}
      </BigPhone>
      <BigPhone x={1300} y={170} w={380} h={720} seed={570} rot={5}>
        {(sx, sy, sw, sh) => <AgreeScreen sx={sx} sy={sy} sw={sw} sh={sh} tap={ramp(f, 60, 76)} seed={571} />}
      </BigPhone>
      <HoldingHand x={250} y={700} s={1.5} skin={SKIN.emma} seed={575} />
      <HoldingHand x={1670} y={700} s={1.5} skin={SKIN.rajan} seed={576} flip />
      <Thumb x={430} y={760} t={tapL} skin={SKIN.emma} />
      <Thumb x={1490} y={760} t={tapR} skin={SKIN.rajan} flip />
      {/* the agreed sheet + lock */}
      <Bloom cx={960} cy={560} rx={260} ry={300} color={C.marigoldTint} op={glow * 0.8} />
      <g transform="rotate(2 960 540)">
        <Fill d={rectD(820, 360, 280, 380, 6)} color={C.cream} op={0.85} seed={580} f="wcS" knock={C.cream} />
        <DhakaSwatch x={820} y={360} w={280} h={16} seed={581} />
        {[0, 1, 2, 3].map((k) => (
          <g key={k}>
            <CheckBox x={856} y={420 + k * 60} s={0.7} t={k < 2 ? ramp(f, 46, 56) : ramp(f, 78, 88)} seed={582 + k * 3} />
            <R s={L(880, 420 + k * 60, 1060 - (k % 2) * 40, 420 + k * 60)} seed={595 + k} o={THIN} opacity={0.6} />
          </g>
        ))}
      </g>
      <g transform={`translate(960 ${lockDrop}) scale(${1 + sq} ${1 - sq})`}>
        <Padlock x={0} y={0} s={1.3} closed={closed} seed={600} />
      </g>
    </Shot>
  );
};

/* ------------------------------------------------------------------ */
/* B4 — Payment held                                                  */
/* ------------------------------------------------------------------ */

const arc = (t: number, a: [number, number], b: [number, number], h: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * h] as [number, number];

export const S4_1: React.FC = () => {
  const f = useCurrentFrame();
  const flights = [18, 30, 42, 54, 66];
  const landed = flights.filter((s) => f >= s + 24).length * 2;
  const lid = ramp(f, 92, 106, E.in);
  const lock = ramp(f, 112, 122, E.out);
  const pay = act(f, 10, 18, 0, 1);
  const clockA = ramp(f, 130, 210, E.linear) * 720;
  return (
    <Shot cam={{x: 960, y: 540, z: kf(f, [[0, 1], [210, 1.03]])}}>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.22} f="wcL" />
      <Wash d={rectD(-100, 960, 2200, 300)} color={C.crimsonTint} op={0.3} f="wcL" />
      <Character who="emma" x={360} y={1000} scale={1.45} expr={f > 110 ? 'content' : 'hopeful'} pose={mixPose(POSE.phone, POSE.holdOut, pay)} frontProp={<Phone x={8} y={-8} s={0.75} seed={610} glow={ramp(f, 10, 30) * (1 - ramp(f, 80, 100))} />} />
      <Jar x={960} y={940} seed={620} lid={lid} coins={landed} lock={lock} />
      {flights.map((s, i) => {
        const t = ramp(f, s, s + 24, E.soft);
        if (t <= 0 || t >= 1) return null;
        const [x, y] = arc(t, [520, 620], [960 + hn(i) * 40, 640], 260);
        return <Coin key={i} x={x} y={y} s={1.5} seed={630 + i} spin={f / 3} />;
      })}
    </Shot>
  );
};

export const S4_2: React.FC = () => {
  const f = useCurrentFrame();
  const accept = act(f, 8, 16, 0, 1);
  const lock = 1 - ramp(f, 46, 54, E.out);
  const open = ramp(f, 54, 70, E.out);
  const e = f < 40 ? EXPR.determined : EXPR.joy;
  const streams = [
    {to: [2050, 260] as [number, number], col: C.crimson},
    {to: [2050, 520] as [number, number], col: C.marigold},
    {to: [2050, 780] as [number, number], col: C.pine},
  ];
  return (
    <Shot>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.22} f="wcL" />
      <Wash d={rectD(-100, 960, 2200, 300)} color={C.crimsonTint} op={0.3} f="wcL" />
      <Character who="emma" x={340} y={1180} scale={1.9} expr={e} pose={{...mixPose(POSE.phone, POSE.point, accept), legs: 'hidden'}} frontProp={<Phone x={8} y={-8} s={0.75} seed={650} />} />
      <SpeechBubble x={110} y={70} w={300} h={220} tail={[330, 440]} seed={651} t={ramp(f, 14, 26)}>
        <Tick x={262} y={186} s={1.4} t={ramp(f, 20, 40)} seed={652} />
      </SpeechBubble>
      <Jar x={900} y={980} seed={660} lid={1} coins={Math.max(0, 10 - Math.floor(ramp(f, 66, 120, E.linear) * 10))} lock={lock} open={open} />
      {Array.from({length: 12}).map((_, i) => {
        const s = 64 + i * 5;
        const t = ramp(f, s, s + 34, E.soft);
        if (t <= 0 || t >= 1) return null;
        const st = streams[i % 3];
        const [x, y] = arc(t, [900, 600], st.to, 180);
        return <Coin key={i} x={x} y={y} s={1.6} seed={670 + i} spin={f / 3} />;
      })}
    </Shot>
  );
};

export const B3_SHOTS: [React.FC, number][] = [
  [S3_1, 240],
  [S3_2, 180],
];
export const B4_SHOTS: [React.FC, number][] = [
  [S4_1, 140],
  [S4_2, 160],
];

export {clamp01, Rc};
