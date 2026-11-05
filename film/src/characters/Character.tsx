import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, SKIN} from '../lib/theme';
import {DrawCtx, El, L, P, R, Shape, useBoil} from '../lib/rough';
import {Wash, ellD, rectD} from '../lib/paint';
import {hn, lerp} from '../lib/anim';

/* ================================================================== */
/* MODEL SHEET — every character in the film is drawn by this one      */
/* component. Scenes only change pose / expression / props.            */
/* Local space: feet at (0,0), facing screen-right, ~370 units tall.   */
/* ================================================================== */

export type Who = 'emma' | 'rajan' | 'sita' | 'bikash' | 'pemba' | 'anusha' | 'kid1' | 'kid2' | 'kid3' | 'cust1' | 'cust2';

export type Expr = {
  browY: number; // -1 low .. 1 raised
  browTilt: number; // + inner ends up (worried/sad), - inner down (determined)
  curve: number; // mouth: -1 frown .. 1 smile
  open: number; // 0 closed .. 1 wide
  mw: number; // mouth width factor
  eye: number; // eye openness 0..1.2
  happyEyes: number; // 0..1 closed ^ ^ eyes
  blush: number;
  lookX: number;
  lookY: number;
  sweat: number;
};

const X = (e: Partial<Expr>): Expr => ({
  browY: 0,
  browTilt: 0,
  curve: 0.25,
  open: 0,
  mw: 1,
  eye: 1,
  happyEyes: 0,
  blush: 0,
  lookX: 0.4,
  lookY: 0,
  sweat: 0,
  ...e,
});

export const EXPR = {
  neutral: X({}),
  content: X({curve: 0.5, browY: 0.1}),
  happy: X({curve: 0.9, open: 0.25, browY: 0.35, blush: 0.5}),
  joy: X({curve: 1, open: 0.85, mw: 1.25, browY: 0.7, happyEyes: 1, blush: 0.9}),
  hopeful: X({curve: 0.45, browY: 0.5, browTilt: 0.35, eye: 1.1, lookY: -0.4}),
  worried: X({curve: -0.35, browTilt: 0.85, browY: 0.15, mw: 0.8, lookY: 0.2}),
  sad: X({curve: -0.75, browTilt: 1, browY: -0.1, mw: 0.85, eye: 0.75, lookY: 0.9, lookX: 0.1}),
  surprised: X({curve: 0, open: 0.7, mw: 0.6, browY: 1, eye: 1.25}),
  thinking: X({curve: 0.05, browY: 0.3, browTilt: -0.2, mw: 0.7, lookX: 0.8, lookY: -0.8}),
  determined: X({curve: 0.4, browTilt: -0.45, browY: -0.1, eye: 1}),
  overwhelmed: X({curve: -0.2, open: 0.15, browTilt: 0.9, browY: 0.6, eye: 1.2, sweat: 1, mw: 0.9}),
  proud: X({curve: 0.8, browY: 0.2, happyEyes: 0.55, blush: 0.4}),
};
export type ExprName = keyof typeof EXPR;

export const mixExpr = (a: Expr, b: Expr, t: number): Expr => {
  const o = {} as Expr;
  (Object.keys(a) as (keyof Expr)[]).forEach((k) => (o[k] = lerp(a[k], b[k], t)));
  return o;
};

export type Pose = {
  fa: [number, number]; // front arm: shoulder angle (fwd +), elbow bend (fwd +)
  ba: [number, number]; // back arm
  lean: number; // deg, + forward
  head: number; // head tilt deg, + forward (nod)
  legs: 'stand' | 'walk' | 'hidden' | 'jump';
  walk: number; // walk phase (radians)
  squash: number; // + squash, - stretch
  lift: number; // vertical offset (jump), + up
};

const PZ = (p: Partial<Pose>): Pose => ({fa: [10, 16], ba: [-8, 14], lean: 0, head: 0, legs: 'stand', walk: 0, squash: 0, lift: 0, ...p});

export const POSE = {
  idle: PZ({}),
  typing: PZ({fa: [42, 62], ba: [38, 58], lean: 6, head: 6}),
  phone: PZ({fa: [28, 118], ba: [-6, 18], head: 10}),
  phoneUp: PZ({fa: [40, 112], ba: [-6, 18], head: 2}),
  point: PZ({fa: [78, 8], ba: [-6, 18]}),
  explain: PZ({fa: [55, 55], ba: [30, 50]}),
  think: PZ({fa: [45, 140], ba: [30, 85], head: -4}),
  wave: PZ({fa: [10, 20], ba: [120, 50], head: -4}),
  cheer: PZ({fa: [196, -8], ba: [158, 14], head: -8}),
  shrug: PZ({fa: [22, 95], ba: [18, 95], head: -6}),
  camera: PZ({fa: [95, 95], ba: [86, 100], head: 2}),
  holdOut: PZ({fa: [62, 40], ba: [-6, 18]}),
  slump: PZ({fa: [2, 4], ba: [0, 4], head: 14, lean: 4}),
  pockets: PZ({fa: [14, -16], ba: [12, -16], head: 12, lean: 2}),
  hug: PZ({fa: [50, 80], ba: [44, 84], head: 4}),
  handsUp: PZ({fa: [200, -20], ba: [140, 30], head: -6}),
  cup: PZ({fa: [30, 95], ba: [-6, 18]}),
};
export type PoseName = keyof typeof POSE;

export const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  fa: [lerp(a.fa[0], b.fa[0], t), lerp(a.fa[1], b.fa[1], t)],
  ba: [lerp(a.ba[0], b.ba[0], t), lerp(a.ba[1], b.ba[1], t)],
  lean: lerp(a.lean, b.lean, t),
  head: lerp(a.head, b.head, t),
  legs: t < 0.5 ? a.legs : b.legs,
  walk: lerp(a.walk, b.walk, t),
  squash: lerp(a.squash, b.squash, t),
  lift: lerp(a.lift, b.lift, t),
});

/* ------------------------------------------------------------------ */
/* Character design data                                              */
/* ------------------------------------------------------------------ */

type Design = {
  skin: string;
  hair: string;
  height: number;
  shirt: string;
  shirtOp: number;
  sleeve: string; // upper arm colour
  sleeveOp: number;
  fore: 'skin' | 'sleeve';
  trousers: string;
  trousersOp: number;
  shoes: string;
  seed: number;
};

const D: Record<Who, Design> = {
  emma: {skin: SKIN.emma, hair: '#A8743E', height: 1, shirt: C.crimsonTint, shirtOp: 0.5, sleeve: C.crimsonTint, sleeveOp: 0.5, fore: 'skin', trousers: C.inkSoft, trousersOp: 0.55, shoes: C.ink, seed: 100},
  rajan: {skin: SKIN.rajan, hair: C.ink, height: 1.05, shirt: C.cream, shirtOp: 0.9, sleeve: C.pine, sleeveOp: 0.82, fore: 'sleeve', trousers: '#4A3E3A', trousersOp: 0.7, shoes: '#3a2418', seed: 200},
  sita: {skin: SKIN.sita, hair: C.ink, height: 0.96, shirt: C.crimson, shirtOp: 0.82, sleeve: C.crimson, sleeveOp: 0.82, fore: 'skin', trousers: C.marigoldTint, trousersOp: 0.7, shoes: '#5a2a1a', seed: 300},
  bikash: {skin: SKIN.bikash, hair: C.ink, height: 0.99, shirt: C.pineTint, shirtOp: 0.75, sleeve: C.pineTint, sleeveOp: 0.75, fore: 'skin', trousers: '#3F4650', trousersOp: 0.6, shoes: C.ink, seed: 400},
  pemba: {skin: '#B88158', hair: C.ink, height: 0.97, shirt: C.marigold, shirtOp: 0.62, sleeve: C.marigold, sleeveOp: 0.62, fore: 'skin', trousers: C.pine, trousersOp: 0.55, shoes: '#4a2a1a', seed: 1000},
  anusha: {skin: '#B98159', hair: C.ink, height: 0.98, shirt: C.cream, shirtOp: 0.9, sleeve: C.cream, sleeveOp: 0.9, fore: 'skin', trousers: C.ink, trousersOp: 0.5, shoes: C.ink, seed: 1100},
  kid1: {skin: '#B47650', hair: C.ink, height: 0.93, shirt: C.marigold, shirtOp: 0.6, sleeve: C.marigold, sleeveOp: 0.6, fore: 'skin', trousers: C.inkSoft, trousersOp: 0.5, shoes: C.ink, seed: 500},
  kid2: {skin: '#C48A62', hair: C.ink, height: 0.95, shirt: C.crimsonTint, shirtOp: 0.8, sleeve: C.crimsonTint, sleeveOp: 0.8, fore: 'skin', trousers: C.pine, trousersOp: 0.5, shoes: C.ink, seed: 600},
  kid3: {skin: '#A66C46', hair: C.ink, height: 0.97, shirt: C.sage, shirtOp: 0.9, sleeve: C.sage, sleeveOp: 0.9, fore: 'skin', trousers: C.inkSoft, trousersOp: 0.6, shoes: C.ink, seed: 700},
  cust1: {skin: '#EBC09C', hair: '#6A4A30', height: 1.0, shirt: C.marigoldTint, shirtOp: 0.8, sleeve: C.marigoldTint, sleeveOp: 0.8, fore: 'skin', trousers: C.inkSoft, trousersOp: 0.5, shoes: C.ink, seed: 800},
  cust2: {skin: '#9C6644', hair: C.ink, height: 1.02, shirt: C.crimsonTint, shirtOp: 0.7, sleeve: C.crimsonTint, sleeveOp: 0.7, fore: 'skin', trousers: C.pine, trousersOp: 0.55, shoes: C.ink, seed: 900},
};

const OUT = {strokeWidth: 2.6, roughness: 0.9};
const THIN = {strokeWidth: 1.6, roughness: 0.7, single: true};

const L1 = 62;
const L2 = 56;
const SHF: [number, number] = [-20, -242]; // front shoulder
const SHB: [number, number] = [26, -246]; // back shoulder
const HIPF: [number, number] = [-10, -150];
const HIPB: [number, number] = [14, -150];
const NECK: [number, number] = [4, -258];

const capsule = (len: number, w: number) => rectD(-w / 2, -w / 2, w, len + w, w / 2);

/* head outline (facing right) */
const HEAD = 'M -38 -318 C -40 -352 -16 -366 6 -366 C 32 -366 50 -350 49 -318 C 48 -290 34 -263 8 -262 C -16 -262 -37 -286 -38 -318 Z';

/* torsos */
const TORSO = 'M -30 -251 C -42 -247 -46 -234 -43 -216 C -40 -194 -36 -170 -33 -146 L 31 -146 C 35 -170 41 -196 41 -222 C 41 -238 37 -249 26 -253 C 10 -259 -14 -259 -30 -251 Z';
const KURTA = 'M -30 -251 C -42 -247 -46 -234 -43 -216 C -41 -196 -40 -174 -41 -150 L -49 -62 C -16 -56 16 -56 47 -62 L 39 -150 C 39 -174 41 -196 41 -222 C 41 -238 37 -249 26 -253 C 10 -259 -14 -259 -30 -251 Z';
const APRON = 'M -16 -224 C -4 -228 10 -228 22 -226 L 25 -170 L 36 -78 C 10 -72 -16 -72 -38 -78 L -26 -170 Z';
const JACKET_L = 'M -37 -244 C -47 -208 -42 -170 -38 -128 C -28 -126 -16 -126 -6 -128 L -4 -184 L 0 -248 C -14 -252 -26 -250 -37 -244 Z';
const JACKET_R = 'M 16 -252 L 10 -190 L 14 -128 C 22 -126 30 -126 36 -128 C 38 -168 43 -212 33 -247 C 28 -250 22 -252 16 -252 Z';

const HAIR: Record<string, string> = {
  emma: 'M -46 -300 C -54 -352 -20 -382 12 -377 C 44 -374 62 -350 55 -322 C 42 -342 26 -346 12 -342 C 4 -334 -4 -326 -12 -312 C -16 -296 -18 -282 -26 -272 C -40 -276 -46 -288 -46 -300 Z',
  rajan: 'M -41 -318 C -45 -356 -16 -374 10 -372 C 38 -371 54 -354 51 -330 C 42 -344 28 -349 14 -347 C 4 -351 -10 -347 -20 -338 C -26 -331 -29 -322 -29 -310 L -37 -304 Z',
  sita: 'M -43 -308 C -48 -354 -18 -376 9 -374 C 38 -372 56 -352 53 -322 C 46 -340 30 -351 12 -349 C 0 -341 -10 -332 -19 -316 C -23 -300 -27 -288 -30 -274 C -40 -282 -43 -294 -43 -308 Z',
  bikash: 'M -41 -342 C -46 -328 -45 -314 -38 -300 L -33 -316 L -28 -302 L -26 -322 C -18 -330 -4 -334 14 -334 L 30 -330 L 34 -342 Z',
  kid1: 'M -41 -316 C -46 -356 -14 -378 12 -374 C 40 -372 56 -352 52 -326 L 44 -340 L 38 -330 L 30 -344 L 20 -336 L 10 -346 C -6 -342 -20 -334 -28 -318 L -36 -304 Z',
  kid2: 'M -45 -304 C -50 -352 -18 -376 9 -374 C 38 -372 56 -352 53 -322 C 44 -342 28 -350 12 -348 C -2 -340 -12 -328 -20 -312 C -26 -290 -30 -262 -38 -246 C -48 -262 -46 -286 -45 -304 Z',
  pemba: 'M -45 -304 C -50 -352 -18 -376 9 -374 C 38 -372 56 -352 53 -322 C 40 -344 24 -350 8 -346 C -2 -338 -12 -326 -20 -312 C -26 -290 -30 -262 -38 -246 C -48 -262 -46 -286 -45 -304 Z',
  anusha: 'M -41 -318 C -45 -356 -16 -374 10 -372 C 38 -371 54 -354 51 -330 C 40 -346 24 -352 8 -350 C -4 -350 -16 -344 -24 -334 C -30 -326 -32 -316 -32 -304 L -39 -300 Z',
  kid3: 'M -40 -320 C -42 -354 -14 -372 10 -370 C 36 -369 52 -354 50 -332 C 40 -342 26 -346 12 -344 C 0 -344 -14 -340 -24 -330 L -32 -306 Z',
  cust1: 'M -44 -296 C -54 -354 -18 -380 12 -376 C 44 -372 60 -350 54 -322 C 40 -340 24 -346 10 -340 C 2 -330 -6 -318 -14 -300 C -18 -284 -22 -268 -30 -258 C -44 -266 -46 -282 -44 -296 Z',
  cust2: 'M -40 -322 C -42 -356 -14 -372 10 -370 C 36 -369 52 -354 50 -334 C 38 -340 20 -342 6 -340 C -8 -338 -20 -334 -28 -322 L -34 -308 Z',
};

/* ------------------------------------------------------------------ */

const rad = (a: number) => (a * Math.PI) / 180;
const fk = (o: [number, number], ang: number, len: number): [number, number] => [o[0] + Math.sin(rad(ang)) * len, o[1] + Math.cos(rad(ang)) * len];

/** Rounded joint path through three points (shoulder/hip -> elbow/knee -> hand/foot). */
const jointPath = (a: [number, number], b: [number, number], c: [number, number]) => {
  const k = 9;
  const ab = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const bc = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1;
  const p1: [number, number] = [b[0] - ((b[0] - a[0]) / ab) * k, b[1] - ((b[1] - a[1]) / ab) * k];
  const p2: [number, number] = [b[0] + ((c[0] - b[0]) / bc) * k, b[1] + ((c[1] - b[1]) / bc) * k];
  return `M ${a[0]} ${a[1]} L ${p1[0]} ${p1[1]} Q ${b[0]} ${b[1]} ${p2[0]} ${p2[1]} L ${c[0]} ${c[1]}`;
};

/** An inked tube: ink outline, opaque paper body (hides what is behind), wash. Geometry boils with the linework. */
const Tube: React.FC<{pts: [number, number][]; w: number; color: string; op: number}> = ({pts, w, color, op}) => {
  const b = useBoil();
  const dc = React.useContext(DrawCtx);
  if (dc <= 0.01) return null;
  const j = pts.map(([x, y], i) => [x + hn(b * 11 + i * 3 + x) * 0.9, y + hn(b * 5 + i * 7 + y) * 0.9] as [number, number]);
  const d = j.length === 3 ? jointPath(j[0], j[1], j[2]) : `M ${j[0][0]} ${j[0][1]} L ${j[1][0]} ${j[1][1]}`;
  const ww = w + hn(b * 3.3 + w) * 0.6;
  return (
    <g opacity={Math.min(1, dc * 1.5)}>
      <path d={d} stroke={C.ink} strokeWidth={ww + 5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={C.paper} strokeWidth={ww} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={d}
        stroke={color}
        strokeWidth={ww - 2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={op * 0.92 * Math.max(0, (dc - 0.55) / 0.45)}
        style={{mixBlendMode: 'multiply'}}
      />
      <path d={d} stroke={C.cream} strokeWidth={Math.max(2, ww * 0.18)} fill="none" strokeLinecap="round" opacity={0.25} transform={`translate(${-ww * 0.22} 0)`} />
    </g>
  );
};

/** Opaque knock-out + wash + rough ink for a closed shape. */
const Part: React.FC<{d: string; color: string; op: number; seed: number; o?: object; fill?: string}> = ({d, color, op, seed, o, fill}) => {
  const dc = React.useContext(DrawCtx);
  return (
    <>
      <path d={d} fill={fill ?? C.paper} opacity={Math.min(1, dc * 1.5)} />
      <Wash d={d} color={color} op={op} f="wcS" />
      <R s={P(d)} seed={seed} o={{...OUT, ...o}} />
    </>
  );
};

const Arm: React.FC<{
  sh: [number, number];
  a: [number, number];
  d: Design;
  prop?: React.ReactNode;
}> = ({sh, a, d, prop}) => {
  const el = fk(sh, a[0], L1);
  const hand = fk(el, a[0] + a[1], L2);
  const skinFore = d.fore === 'skin';
  const cuff = fk(el, a[0] + a[1], 6);
  return (
    <g>
      {skinFore ? (
        <>
          <Tube pts={[el, hand]} w={15} color={d.skin} op={0.8} />
          <Tube pts={[sh, cuff]} w={23} color={d.sleeve} op={d.sleeveOp} />
        </>
      ) : (
        <Tube pts={[sh, el, hand]} w={22} color={d.sleeve} op={d.sleeveOp} />
      )}
      <circle cx={hand[0]} cy={hand[1]} r={10.5} fill={C.paper} />
      <Wash d={ellD(hand[0], hand[1], 10, 10.5)} color={d.skin} op={0.85} f="wcS" />
      <R s={El(hand[0], hand[1], 20, 21)} seed={d.seed + Math.round(sh[0])} o={{...OUT, strokeWidth: 2.1}} />
      {prop ? <g transform={`translate(${hand[0]} ${hand[1]})`}>{prop}</g> : null}
    </g>
  );
};

const Leg: React.FC<{hip: [number, number]; thigh: number; knee: number; d: Design; seed: number}> = ({hip, thigh, knee, d, seed}) => {
  const kn = fk(hip, thigh, 74);
  const ft = fk(kn, thigh - knee, 72);
  return (
    <g>
      <Tube pts={[hip, kn, ft]} w={25} color={d.trousers} op={d.trousersOp} />
      <g transform={`translate(${ft[0]} ${ft[1] + 2})`}>
        <Part d="M -12 -6 C -12 6 0 9 14 9 C 26 9 31 4 29 -1 C 25 -7 10 -9 -12 -6 Z" color={d.shoes} op={0.8} seed={seed + 2} />
      </g>
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Face                                                               */
/* ------------------------------------------------------------------ */

const Face: React.FC<{who: Who; e: Expr; blink: number; talk: number; seed: number}> = ({who, e, blink, talk, seed}) => {
  const eyes: [number, number][] = [
    [2, -318],
    [30, -318],
  ];
  const lx = e.lookX * 2.6;
  const ly = e.lookY * 2.4;
  const open = Math.max(0, e.eye * (1 - blink));
  const browBase = -333 - e.browY * 6;
  const mo = Math.max(0, e.open + talk);
  const mw = 11 * e.mw;
  const mx = 21;
  const my = -287;
  const c = e.curve;
  const cornerY = my - c * 3;
  const glasses = who === 'rajan';
  return (
    <g>
      {/* blush */}
      {e.blush > 0.02 ? (
        <>
          <Wash d={ellD(-6, -298, 8, 5)} color={C.crimson} op={0.3 * e.blush} f="wcS" />
          <Wash d={ellD(38, -298, 6, 4.5)} color={C.crimson} op={0.3 * e.blush} f="wcS" />
        </>
      ) : null}
      {/* eyes */}
      {eyes.map(([x, y], i) =>
        e.happyEyes > 0.5 ? (
          <path key={i} d={`M ${x - 6} ${y + 2} Q ${x} ${y - 6} ${x + 6} ${y + 2}`} stroke={C.ink} strokeWidth={3.2} fill="none" strokeLinecap="round" />
        ) : open < 0.18 ? (
          <path key={i} d={`M ${x - 5.5} ${y} Q ${x} ${y + 2} ${x + 5.5} ${y}`} stroke={C.ink} strokeWidth={2.8} fill="none" strokeLinecap="round" />
        ) : (
          <g key={i}>
            <ellipse cx={x + lx} cy={y + ly} rx={4.4} ry={6 * open} fill={C.ink} />
            <circle cx={x + lx + 1.4} cy={y + ly - 2.2 * open} r={1.4} fill={C.cream} />
          </g>
        ),
      )}
      {/* brows */}
      {[
        [-8, 10],
        [22, 38],
      ].map(([a, b], i) => {
        const inner = i === 0 ? b : a;
        const outer = i === 0 ? a : b;
        const yi = browBase - e.browTilt * 5.5;
        const yo = browBase + e.browTilt * 2.5;
        return (
          <path
            key={i}
            d={`M ${outer} ${yo} Q ${(inner + outer) / 2} ${Math.min(yi, yo) - 3} ${inner} ${yi}`}
            stroke={who === 'emma' || who === 'cust1' ? '#5b3a1e' : C.ink}
            strokeWidth={3.4}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}
      {/* nose */}
      <path d="M 40 -311 Q 48 -302 40 -298" stroke={C.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      {/* mouth */}
      {mo < 0.08 ? (
        <path
          d={`M ${mx - mw} ${cornerY} Q ${mx} ${my + c * 8} ${mx + mw} ${cornerY}`}
          stroke={C.ink}
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M ${mx - mw} ${cornerY} Q ${mx} ${my + c * 4 - mo * 2} ${mx + mw} ${cornerY} Q ${mx} ${my + c * 6 + mo * 15} ${mx - mw} ${cornerY} Z`}
          stroke={C.ink}
          strokeWidth={2.4}
          fill="#6B1F2A"
          strokeLinejoin="round"
        />
      )}
      {/* sweat drop */}
      {e.sweat > 0.05 ? (
        <g opacity={e.sweat}>
          <Wash d="M 52 -352 C 46 -342 46 -334 52 -334 C 58 -334 58 -342 52 -352 Z" color={C.pineTint} op={0.9} f="wcS" />
          <R s={P('M 52 -352 C 46 -342 46 -334 52 -334 C 58 -334 58 -342 52 -352 Z')} seed={seed + 77} o={THIN} />
        </g>
      ) : null}
      {glasses ? (
        <g>
          <R s={El(2, -318, 25, 21)} seed={seed + 60} o={{...THIN, strokeWidth: 2.2}} />
          <R s={El(31, -318, 22, 20)} seed={seed + 61} o={{...THIN, strokeWidth: 2.2}} />
          <R s={L(14, -320, 20, -320)} seed={seed + 62} o={THIN} />
          <R s={L(-10, -320, -28, -314)} seed={seed + 63} o={THIN} />
        </g>
      ) : null}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Head                                                               */
/* ------------------------------------------------------------------ */

const Head: React.FC<{who: Who; d: Design; e: Expr; blink: number; talk: number; back?: boolean}> = ({who, d, e, blink, talk, back}) => {
  const s = d.seed;
  const hairD = HAIR[who];
  if (back) {
    return (
      <g>
        <path d={rectD(-8, -272, 20, 30)} fill={C.paper} />
        <Wash d={rectD(-8, -272, 20, 30)} color={d.skin} op={0.8} f="wcS" />
        <Part d={ellD(46, -310, 7, 10)} color={d.skin} op={0.85} seed={s + 3} o={{...THIN, strokeWidth: 2}} />
        <Part d={HEAD} color={d.hair} op={who === 'emma' ? 0.72 : 0.86} seed={s + 4} fill={who === 'emma' ? C.paper : '#efe4d4'} />
        <R s={P('M -20 -350 C -10 -320 -14 -290 -22 -272')} seed={s + 6} o={THIN} />
        <R s={P('M 14 -360 C 20 -330 22 -300 18 -268')} seed={s + 7} o={THIN} />
        {who === 'bikash' ? <path d="M -38 -338 C -38 -356 -32 -372 -24 -382 L 42 -371 C 48 -360 50 -350 50 -338 C 22 -344 -8 -344 -38 -338 Z" fill="url(#dhakaS)" stroke={C.ink} strokeWidth={2.4} /> : null}
      </g>
    );
  }
  return (
    <g>
      {/* Sita's braid falls behind the shoulder */}
      {who === 'sita' ? (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <Part d={ellD(-34 - i * 1.5, -276 + i * 22, 10 - i * 0.6, 13)} color={C.ink} op={0.75} seed={s + 30 + i} o={{...THIN, strokeWidth: 2}} />
            </g>
          ))}
          <R s={L(-41, -170, -41, -156)} seed={s + 39} o={{...THIN, stroke: C.marigold, strokeWidth: 4}} />
        </g>
      ) : null}
      {who === 'pemba' ? <Part d="M -44 -300 C -54 -250 -50 -200 -40 -186 C -30 -196 -26 -240 -24 -270 Z" color={C.ink} op={0.8} seed={s + 41} o={{...THIN, strokeWidth: 2}} /> : null}
      {who === 'anusha' ? <Part d={ellD(-22, -366, 22, 20)} color={C.ink} op={0.86} seed={s + 42} fill="#efe4d4" o={{strokeWidth: 2.3}} /> : null}
      {who === 'kid2' ? <Wash d="M -44 -300 C -50 -260 -46 -238 -36 -232 L -22 -270 Z" color={C.ink} op={0.7} f="wcS" /> : null}
      {/* neck */}
      <path d={rectD(-8, -272, 20, 30)} fill={C.paper} />
      <Wash d={rectD(-8, -272, 20, 30)} color={d.skin} op={0.8} f="wcS" />
      <R s={L(-8, -270, -8, -246)} seed={s + 1} o={THIN} />
      <R s={L(12, -268, 12, -248)} seed={s + 2} o={THIN} />
      {who === 'anusha' ? (
        <g>
          <Part d="M -32 -262 C -12 -244 20 -244 38 -262 L 34 -238 C 12 -226 -12 -226 -28 -238 Z" color={C.marigold} op={0.9} seed={s + 43} o={{strokeWidth: 2.2}} />
          <Part d="M 10 -236 L 28 -176 C 22 -172 14 -172 8 -176 L 0 -232 Z" color={C.marigold} op={0.85} seed={s + 44} o={{strokeWidth: 2}} />
        </g>
      ) : null}
      {/* ear */}
      {who !== 'emma' && who !== 'cust1' ? (
        <>
          <Part d={ellD(-27, -310, 7, 10)} color={d.skin} op={0.85} seed={s + 3} o={{...THIN, strokeWidth: 2}} />
        </>
      ) : null}
      {/* face */}
      <Part d={HEAD} color={d.skin} op={0.82} seed={s + 4} />
      {/* hair */}
      <Part d={hairD} color={d.hair} op={who === 'emma' ? 0.72 : 0.86} seed={s + 5} o={{strokeWidth: 2.3}} fill={who === 'emma' || who === 'cust1' ? C.paper : '#efe4d4'} />
      {who === 'emma' ? (
        <>
          <R s={P('M -6 -364 C 6 -352 16 -346 30 -344')} seed={s + 6} o={THIN} />
          <R s={P('M -24 -350 C -26 -330 -24 -310 -30 -292')} seed={s + 7} o={THIN} />
        </>
      ) : null}
      {who === 'sita' ? <R s={P('M 9 -374 C 6 -366 4 -356 6 -348')} seed={s + 8} o={THIN} /> : null}
      {who === 'sita' ? <circle cx={-27} cy={-294} r={3.4} fill={C.marigold} stroke={C.ink} strokeWidth={1} /> : null}
      {/* Bikash's dhaka topi */}
      {who === 'bikash' ? (
        <g>
          <path d="M -38 -338 C -38 -356 -32 -372 -24 -382 L 42 -371 C 48 -360 50 -350 50 -338 C 22 -344 -8 -344 -38 -338 Z" fill="url(#dhakaS)" opacity={0.92} />
          <Wash d="M -38 -338 C -38 -356 -32 -372 -24 -382 L 42 -371 C 48 -360 50 -350 50 -338 C 22 -344 -8 -344 -38 -338 Z" color={C.crimson} op={0.25} f="wcS" />
          <R s={P('M -38 -338 C -38 -356 -32 -372 -24 -382 L 42 -371 C 48 -360 50 -350 50 -338 C 22 -344 -8 -344 -38 -338 Z')} seed={s + 9} o={OUT} />
          <R s={P('M -38 -338 C -8 -346 22 -346 50 -338')} seed={s + 10} o={{...THIN, strokeWidth: 2}} />
        </g>
      ) : null}
      <Face who={who} e={e} blink={blink} talk={talk} seed={s} />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Body                                                               */
/* ------------------------------------------------------------------ */

const Body: React.FC<{who: Who; d: Design}> = ({who, d}) => {
  const s = d.seed;
  if (who === 'sita') {
    return (
      <g>
        <Part d={KURTA} color={C.crimson} op={0.8} seed={s + 11} />
        {/* marigold hem + neckline trim */}
        <Wash d="M -46 -74 C -16 -68 16 -68 45 -74 L 46 -62 C 16 -56 -16 -56 -48 -62 Z" color={C.marigold} op={0.9} f="wcS" />
        <R s={P('M -47 -74 C -16 -68 16 -68 45 -74')} seed={s + 12} o={THIN} />
        <R s={P('M -10 -252 L 4 -224 L 16 -253')} seed={s + 13} o={{...THIN, stroke: C.marigold, strokeWidth: 3.4}} />
        <R s={P('M -10 -252 L 4 -224 L 16 -253')} seed={s + 14} o={THIN} />
        <R s={L(-44, -110, -46, -64)} seed={s + 15} o={THIN} />
      </g>
    );
  }
  return (
    <g>
      <Part d={TORSO} color={d.shirt} op={d.shirtOp} seed={s + 11} />
      {who === 'emma' ? (
        <g>
          <R s={P('M -12 -252 L 2 -238 L 16 -253')} seed={s + 12} o={THIN} />
          <Part d={APRON} color={C.marigold} op={0.78} seed={s + 13} />
          <R s={P('M -15 -224 C -12 -240 -10 -250 -8 -256')} seed={s + 14} o={THIN} />
          <R s={P('M 21 -226 C 18 -240 16 -250 14 -256')} seed={s + 15} o={THIN} />
          <R s={P('M -26 -170 C -32 -168 -40 -166 -44 -160 M -44 -168 L -52 -158')} seed={s + 16} o={THIN} />
          <R s={P('M -8 -150 L 14 -150 L 15 -128 L -7 -128 Z')} seed={s + 17} o={THIN} />
        </g>
      ) : null}
      {who === 'rajan' ? (
        <g>
          <R s={P('M -6 -254 L 4 -236 L 14 -254')} seed={s + 12} o={THIN} />
          <Part d={JACKET_L} color={C.pine} op={0.82} seed={s + 13} />
          <Part d={JACKET_R} color={C.pine} op={0.82} seed={s + 14} />
          <R s={P('M 0 -248 L -14 -214 L -4 -200')} seed={s + 15} o={{...THIN, stroke: C.cream, strokeWidth: 1.8}} />
          <R s={P('M 16 -250 L 26 -214 L 12 -200')} seed={s + 16} o={{...THIN, stroke: C.cream, strokeWidth: 1.8}} />
          <circle cx={-6} cy={-170} r={2.6} fill={C.cream} />
        </g>
      ) : null}
      {who === 'bikash' ? (
        <g>
          <R s={P('M -8 -254 C 0 -244 8 -244 16 -254')} seed={s + 12} o={THIN} />
          <R s={P('M 30 -246 C 10 -212 -10 -180 -30 -150')} seed={s + 13} o={{...THIN, strokeWidth: 3.2}} />
        </g>
      ) : null}
      {who === 'pemba' ? (
        <g>
          <R s={P('M -8 -254 C 0 -244 8 -244 16 -254')} seed={s + 12} o={THIN} />
          <R s={P('M 28 -248 C 8 -214 -16 -186 -40 -166')} seed={s + 13} o={{...THIN, strokeWidth: 3.4}} />
          <Part d={rectD(-66, -176, 46, 40, 8)} color={C.inkSoft} op={0.7} seed={s + 14} o={{strokeWidth: 2.2}} />
          <circle cx={-43} cy={-156} r={8} fill={C.pineTint} stroke={C.ink} strokeWidth={1.6} />
        </g>
      ) : null}
      {who === 'kid1' || who === 'kid3' || who === 'cust2' ? <R s={P('M -8 -254 C 0 -244 8 -244 16 -254')} seed={s + 12} o={THIN} /> : null}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Character                                                          */
/* ------------------------------------------------------------------ */

export type CharacterProps = {
  who: Who;
  x: number;
  y: number;
  scale?: number;
  facing?: 1 | -1;
  expr?: ExprName | Expr;
  pose?: PoseName | Pose;
  frontProp?: React.ReactNode;
  backProp?: React.ReactNode;
  talk?: number; // 0..1 talking intensity
  draw?: number; // 0..1 sketch-in
  shadow?: boolean;
  blinkOffset?: number;
  view?: 'front' | 'back';
};

export const Character: React.FC<CharacterProps> = ({
  who,
  x,
  y,
  scale = 1,
  facing = 1,
  expr = 'neutral',
  pose = 'idle',
  frontProp,
  backProp,
  talk = 0,
  draw = 1,
  shadow = true,
  blinkOffset = 0,
  view = 'front',
}) => {
  const f = useCurrentFrame();
  const d = D[who];
  const e = typeof expr === 'string' ? EXPR[expr] : expr;
  const p = typeof pose === 'string' ? POSE[pose] : pose;

  // automatic blink, offset per character so the cast never blinks in unison
  const bp = (f + d.seed * 0.37 + blinkOffset) % 104;
  const blink = bp < 2 ? bp / 2 : bp < 5 ? 1 - (bp - 2) / 3 : 0;
  const tk = talk > 0 ? talk * Math.max(0, 0.22 + 0.32 * Math.sin(f * 1.15) + 0.12 * Math.sin(f * 2.7)) : 0;

  // walk cycle
  let legF = {t: 6, k: 4};
  let legB = {t: -4, k: 3};
  let bob = 0;
  let fa = p.fa;
  let ba = p.ba;
  if (p.legs === 'walk') {
    const ph = p.walk;
    legF = {t: 24 * Math.sin(ph), k: Math.max(0, 34 * Math.sin(ph + 1.4))};
    legB = {t: -24 * Math.sin(ph), k: Math.max(0, 34 * Math.sin(ph + 1.4 + Math.PI))};
    bob = -Math.abs(Math.cos(ph)) * 6 + 3;
    fa = [fa[0] - 16 * Math.sin(ph), fa[1]];
    ba = [ba[0] + 16 * Math.sin(ph), ba[1]];
  } else if (p.legs === 'jump') {
    legF = {t: 34, k: 60};
    legB = {t: 20, k: 50};
  }
  // gentle breathing so held poses still feel alive
  const breathe = Math.sin(f / 22 + d.seed) * 0.008;
  const sq = p.squash;
  const sy = d.height * (1 - sq + breathe);
  const sx = d.height * (1 + sq * 0.55);

  return (
    <DrawCtx.Provider value={draw}>
      <g transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`}>
        {shadow && p.legs !== 'hidden' ? (
          <ellipse cx={4} cy={6} rx={62 - p.lift * 0.15} ry={10} fill={C.ink} opacity={0.1 * draw} />
        ) : null}
        <g transform={`translate(0 ${-p.lift}) scale(${sx} ${sy}) translate(0 ${bob})`}>
          {p.legs !== 'hidden' ? (
            <>
              <Leg hip={HIPB} thigh={legB.t} knee={legB.k} d={d} seed={d.seed + 50} />
              <Leg hip={HIPF} thigh={legF.t} knee={legF.k} d={d} seed={d.seed + 55} />
            </>
          ) : null}
          <g transform={`rotate(${p.lean} 0 -150)`}>
            <Arm sh={SHB} a={ba} d={d} prop={backProp} />
            <Body who={who} d={d} />
            <g transform={`rotate(${p.head} ${NECK[0]} ${NECK[1]})`}>
              <Head who={who} d={d} e={e} blink={blink} talk={tk} back={view === 'back'} />
            </g>
            <Arm sh={SHF} a={fa} d={d} prop={frontProp} />
          </g>
        </g>
      </g>
    </DrawCtx.Provider>
  );
};

export const HEIGHTS = Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v.height])) as Record<Who, number>;
export const SEEDS = Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v.seed]));
export type {Shape};
