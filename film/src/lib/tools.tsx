import React, {useLayoutEffect, useRef} from 'react';
import paper from 'paper/dist/paper-core';
import Zdog from 'zdog';
import p5 from 'p5';
import {T} from './theme';

/* ================================================================== */
/* Paper.js — path geometry for the thread (a Dhaka band that follows */
/* the curve, with the diamond lattice aligned to the path).          */
/* ================================================================== */

let paperReady = false;
const ensurePaper = () => {
  if (!paperReady) {
    paper.setup(new paper.Size(16, 16));
    paperReady = true;
  }
};

type Sample = {x: number; y: number; nx: number; ny: number; tx: number; ty: number; o: number};
const sampleCache = new Map<string, {len: number; pts: Sample[]}>();

/** Samples an SVG path with Paper.js: positions, normals and tangents every `step` px. */
export const samplePath = (d: string, step = 4) => {
  const key = d + '|' + step;
  const hit = sampleCache.get(key);
  if (hit) return hit;
  ensurePaper();
  const path = new paper.Path(d);
  const len = path.length;
  const pts: Sample[] = [];
  for (let o = 0; o <= len; o += step) {
    const p = path.getPointAt(o);
    const n = path.getNormalAt(o);
    const t = path.getTangentAt(o);
    if (p && n && t) pts.push({x: p.x, y: p.y, nx: n.x, ny: n.y, tx: t.x, ty: t.y, o});
  }
  path.remove();
  const v = {len, pts};
  sampleCache.set(key, v);
  return v;
};

/** Point + tangent at a fraction of a path (for coins riding the thread). */
export const pointOn = (d: string, t: number) => {
  const {pts} = samplePath(d);
  const i = Math.max(0, Math.min(pts.length - 1, Math.round(t * (pts.length - 1))));
  return pts[i];
};

/** A woven Dhaka band along a path, drawn up to progress p (0..1). */
export const DhakaBand: React.FC<{d: string; p: number; w?: number; wobble?: number; seed?: number}> = ({d, p, w = 18, wobble = 0, seed = 0}) => {
  if (p <= 0.001) return null;
  const {len, pts} = samplePath(d);
  const n = Math.max(2, Math.floor(pts.length * Math.min(1, p)));
  const vis = pts.slice(0, n);
  const half = w / 2;
  const jit = (i: number) => (wobble ? Math.sin(i * 0.09 + seed) * wobble : 0);
  const left = vis.map((s, i) => `${s.x + s.nx * (half + jit(i))},${s.y + s.ny * (half + jit(i))}`);
  const right = vis.map((s, i) => `${s.x - s.nx * (half - jit(i))},${s.y - s.ny * (half - jit(i))}`).reverse();
  const band = `M ${left.join(' L ')} L ${right.join(' L ')} Z`;
  const edgeL = `M ${left.join(' L ')}`;
  const edgeR = `M ${right.join(' L ')}`;
  // diamonds every w along the path, aligned to the tangent
  const dia: React.ReactNode[] = [];
  const stepIdx = Math.max(1, Math.round(w / 4));
  for (let i = Math.floor(stepIdx / 2); i < vis.length; i += stepIdx) {
    const s = vis[i];
    const a = half * 0.92;
    const b = half * 0.62;
    const k = Math.floor(i / stepIdx);
    const P = (u: number, v: number) => `${s.x + s.tx * u + s.nx * v},${s.y + s.ty * u + s.ny * v}`;
    dia.push(<path key={`a${i}`} d={`M ${P(b, 0)} L ${P(0, a)} L ${P(-b, 0)} L ${P(0, -a)} Z`} fill={k % 2 ? T.honey : T.honeyLight} />);
    dia.push(<path key={`b${i}`} d={`M ${P(b * 0.5, 0)} L ${P(0, a * 0.5)} L ${P(-b * 0.5, 0)} L ${P(0, -a * 0.5)} Z`} fill={T.pine} />);
    dia.push(<circle key={`c${i}`} cx={s.x} cy={s.y} r={Math.max(1, w * 0.07)} fill={T.white} />);
  }
  const tip = vis[vis.length - 1];
  return (
    <g data-len={len}>
      <path d={band} fill={T.ink} opacity={0.12} transform="translate(3 6)" />
      <path d={band} fill={T.brick} />
      {dia}
      <path d={edgeL} fill="none" stroke={T.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d={edgeR} fill="none" stroke={T.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      {p < 0.999 && tip ? <circle cx={tip.x} cy={tip.y} r={half + 1.5} fill={T.brick} stroke={T.ink} strokeWidth={2.6} /> : null}
    </g>
  );
};

/* ================================================================== */
/* Zdog — small pseudo-3D flat objects (a spinning coin, a badge star) */
/* ================================================================== */

const TAU = Math.PI * 2;

const ZdogSvg: React.FC<{x: number; y: number; size: number; build: (illo: any) => void; dep: string}> = ({x, y, size, build, dep}) => {
  const ref = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    const illo = new Zdog.Illustration({element: el, resize: false});
    illo.setSize(size, size);
    build(illo);
    illo.updateRenderGraph();
  }, [dep, size]);
  return <svg ref={ref} x={x - size / 2} y={y - size / 2} width={size} height={size} style={{overflow: 'visible'}} />;
};

/** A marigold coin with a crimson diamond, spinning on its vertical axis. */
export const ZCoin: React.FC<{x: number; y: number; d: number; rotY: number; tilt?: number}> = ({x, y, d, rotY, tilt = 0.25}) => (
  <ZdogSvg
    x={x}
    y={y}
    size={d * 1.6}
    dep={`${rotY.toFixed(3)}|${tilt}|${d}`}
    build={(illo) => {
      const g = new Zdog.Group({addTo: illo, rotate: {y: rotY, x: tilt}});
      const th = d * 0.13;
      new Zdog.Cylinder({addTo: g, diameter: d, length: th, stroke: false, color: T.honey, backface: T.honeyDeep, frontFace: T.honeyLight});
      new Zdog.Ellipse({addTo: g, diameter: d, stroke: 3, color: T.ink, translate: {z: th / 2}});
      new Zdog.Ellipse({addTo: g, diameter: d, stroke: 3, color: T.ink, translate: {z: -th / 2}});
      new Zdog.Ellipse({addTo: g, diameter: d * 0.74, stroke: 2, color: T.honeyDeep, translate: {z: th / 2 + 0.5}});
      new Zdog.Rect({addTo: g, width: d * 0.3, height: d * 0.3, rotate: {z: TAU / 8}, translate: {z: th / 2 + 1}, stroke: 2, fill: true, color: T.brick});
      new Zdog.Rect({addTo: g, width: d * 0.3, height: d * 0.3, rotate: {z: TAU / 8}, translate: {z: -th / 2 - 1}, stroke: 2, fill: true, color: T.brickDeep});
    }}
  />
);

/** A puffy badge star with a darker extruded back, turning in 3D. */
export const ZStar: React.FC<{x: number; y: number; r: number; rotY: number; scale?: number}> = ({x, y, r, rotY, scale = 1}) => {
  if (scale <= 0.01) return null;
  return (
    <ZdogSvg
      x={x}
      y={y}
      size={r * 3}
      dep={`${rotY.toFixed(3)}|${scale.toFixed(3)}|${r}`}
      build={(illo) => {
        const g = new Zdog.Group({addTo: illo, rotate: {y: rotY}, scale});
        const path: {x: number; y: number}[] = [];
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 === 0 ? r : r * 0.45;
          const a = (k / 10) * TAU - TAU / 4;
          path.push({x: Math.cos(a) * rr, y: Math.sin(a) * rr});
        }
        new Zdog.Shape({addTo: g, path, closed: true, fill: true, stroke: r * 0.22, color: T.honeyDeep, translate: {z: -r * 0.12}});
        new Zdog.Shape({addTo: g, path, closed: true, fill: true, stroke: r * 0.22, color: T.ink, translate: {z: r * 0.02}});
        new Zdog.Shape({addTo: g, path, closed: true, fill: true, stroke: r * 0.12, color: T.honey, translate: {z: r * 0.08}});
      }}
    />
  );
};

/* ================================================================== */
/* p5.js — seeded Perlin noise for flow fields and generative motion  */
/* ================================================================== */

let P5: any = null;
const getP5 = () => {
  if (!P5) {
    P5 = new p5((p: any) => {
      p.setup = () => p.noCanvas();
    });
    P5.noiseSeed(2026);
    P5.noiseDetail(3, 0.5);
  }
  return P5;
};

/** p5 noise in [0, 1], deterministic (seeded once). */
export const noise3 = (x: number, y = 0, z = 0): number => getP5().noise(x, y, z);

/**
 * A particle advected through a p5 noise flow field, integrated from t=0 each frame (pure function of
 * the frame, so renders stay deterministic in any order).
 */
export const flowParticle = (seed: number, t: number, base: (u: number) => {x: number; y: number}, amp = 26, freq = 0.004) => {
  const u = t;
  const b = base(u);
  const n1 = noise3(b.x * freq, b.y * freq, seed * 0.37) - 0.5;
  const n2 = noise3(b.x * freq + 40, b.y * freq + 40, seed * 0.37 + u) - 0.5;
  return {x: b.x + n1 * amp * 2, y: b.y + n2 * amp * 2};
};
