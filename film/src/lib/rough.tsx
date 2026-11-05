import React, {createContext, useContext} from 'react';
import rough from 'roughjs';
import {useCurrentFrame} from 'remotion';
import {C} from './theme';

const gen = rough.generator();

export type Pt = [number, number];
export type Shape =
  | {t: 'line'; a: Pt; b: Pt}
  | {t: 'rect'; x: number; y: number; w: number; h: number}
  | {t: 'ellipse'; x: number; y: number; w: number; h: number}
  | {t: 'path'; d: string}
  | {t: 'curve'; pts: Pt[]}
  | {t: 'lin'; pts: Pt[]}
  | {t: 'poly'; pts: Pt[]};

export const L = (x1: number, y1: number, x2: number, y2: number): Shape => ({t: 'line', a: [x1, y1], b: [x2, y2]});
export const Rc = (x: number, y: number, w: number, h: number): Shape => ({t: 'rect', x, y, w, h});
export const El = (x: number, y: number, w: number, h: number): Shape => ({t: 'ellipse', x, y, w, h});
export const P = (d: string): Shape => ({t: 'path', d});
export const Cv = (...pts: Pt[]): Shape => ({t: 'curve', pts});
export const Ln = (...pts: Pt[]): Shape => ({t: 'lin', pts});
export const Pg = (...pts: Pt[]): Shape => ({t: 'poly', pts});

export type RO = {
  roughness?: number;
  bowing?: number;
  strokeWidth?: number;
  stroke?: string;
  fill?: string;
  fillStyle?: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots' | 'dashed' | 'zigzag-line';
  hachureGap?: number;
  hachureAngle?: number;
  fillWeight?: number;
  single?: boolean;
  curveFitting?: number;
};

type PathInfo = {d: string; stroke: string; strokeWidth: number; fill?: string};
const cache = new Map<string, PathInfo[]>();

const build = (s: Shape, o: RO, seed: number): PathInfo[] => {
  const key = JSON.stringify(s) + JSON.stringify(o) + seed;
  const hit = cache.get(key);
  if (hit) return hit;
  const opts = {
    seed,
    roughness: o.roughness ?? 1.05,
    bowing: o.bowing ?? 0.9,
    strokeWidth: o.strokeWidth ?? 2.3,
    stroke: o.stroke ?? C.ink,
    fill: o.fill,
    fillStyle: o.fillStyle ?? 'hachure',
    hachureGap: o.hachureGap ?? 7,
    hachureAngle: o.hachureAngle ?? -50,
    fillWeight: o.fillWeight ?? 1,
    disableMultiStroke: o.single ?? false,
    disableMultiStrokeFill: true,
    maxRandomnessOffset: 1.6,
    preserveVertices: false,
    curveFitting: o.curveFitting ?? 0.95,
  };
  let dr;
  switch (s.t) {
    case 'line':
      dr = gen.line(s.a[0], s.a[1], s.b[0], s.b[1], opts);
      break;
    case 'rect':
      dr = gen.rectangle(s.x, s.y, s.w, s.h, opts);
      break;
    case 'ellipse':
      dr = gen.ellipse(s.x, s.y, s.w, s.h, opts);
      break;
    case 'path':
      dr = gen.path(s.d, opts);
      break;
    case 'curve':
      dr = gen.curve(s.pts, opts);
      break;
    case 'lin':
      dr = gen.linearPath(s.pts, opts);
      break;
    case 'poly':
      dr = gen.polygon(s.pts, opts);
      break;
  }
  const v = gen.toPaths(dr) as PathInfo[];
  if (cache.size > 4000) cache.clear();
  cache.set(key, v);
  return v;
};

/** Boil index: linework is redrawn with a new seed ~7.5x per second (a 3-drawing cycle). */
export const BoilCtx = createContext<number | null>(null);
/** Optional global draw-on multiplier (used to sketch a whole character/prop in). */
export const DrawCtx = createContext<number>(1);

export const useBoil = () => {
  const ctx = useContext(BoilCtx);
  const f = useCurrentFrame();
  return ctx ?? Math.floor(f / 4) % 3;
};

export const R: React.FC<{
  s: Shape;
  seed: number;
  o?: RO;
  draw?: number;
  still?: boolean;
  opacity?: number;
}> = ({s, seed, o = {}, draw = 1, still, opacity}) => {
  const b = useBoil();
  const dctx = useContext(DrawCtx);
  draw = Math.min(draw, dctx);
  if (draw <= 0.001) return null;
  const sd = Math.abs(Math.round(seed)) * 17 + (still ? 0 : b * 5) + 3;
  const paths = build(s, o, sd);
  const partial = draw < 0.999;
  return (
    <g opacity={opacity}>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          fill={p.fill ?? 'none'}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...(partial && p.stroke !== 'none'
            ? {pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - draw}
            : {})}
          opacity={partial && p.stroke === 'none' ? draw : undefined}
        />
      ))}
    </g>
  );
};

/** Many shapes in one style; draw-on is staggered across them like a pen moving stroke to stroke. */
export const RS: React.FC<{shapes: Shape[]; seed: number; o?: RO; draw?: number; still?: boolean; opacity?: number}> = ({
  shapes,
  seed,
  o,
  draw = 1,
  still,
  opacity,
}) => {
  const n = shapes.length;
  return (
    <g opacity={opacity}>
      {shapes.map((s, i) => {
        const local = Math.max(0, Math.min(1, draw * n - i));
        return <R key={i} s={s} seed={seed + i * 3} o={o} draw={local} still={still} />;
      })}
    </g>
  );
};
