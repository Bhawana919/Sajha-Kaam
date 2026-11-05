import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, DISPLAY, HAND} from '../lib/theme';
import {Cv, DrawCtx, El, L, Ln, P, Pt, R, RO, RS, Rc, useBoil} from '../lib/rough';
import {Bloom, HText, Wash, ellD, rectD} from '../lib/paint';
import {E, hn, ramp} from '../lib/anim';
import {DhakaBand} from '../lib/tools';

export const OUT: RO = {strokeWidth: 2.6, roughness: 0.9};
export const THIN: RO = {strokeWidth: 1.6, roughness: 0.8, single: true};
export const HATCH: RO = {strokeWidth: 0.9, roughness: 1.3, single: true, stroke: C.ink};

/** Knock-out + wash + ink for a closed shape. */
export const Fill: React.FC<{
  d: string;
  color?: string;
  op?: number;
  seed: number;
  o?: RO;
  knock?: boolean | string;
  f?: 'wcS' | 'wcM' | 'wcL';
  draw?: number;
  ink?: boolean;
}> = ({d, color, op = 0.75, seed, o, knock = true, f = 'wcM', draw = 1, ink = true}) => {
  const dc = React.useContext(DrawCtx);
  const dd = Math.min(draw, dc);
  return (
    <>
      {knock ? <path d={d} fill={typeof knock === 'string' ? knock : C.paper} opacity={Math.min(1, dd * 2)} /> : null}
      {color ? <Wash d={d} color={color} op={op} f={f} reveal={Math.max(0, (dd - 0.5) * 2)} /> : null}
      {ink ? <R s={P(d)} seed={seed} o={{...OUT, ...o}} draw={dd} /> : null}
    </>
  );
};

/** Pencil hatching inside a rectangle (shadows, depth). */
export const Hatch: React.FC<{x: number; y: number; w: number; h: number; seed: number; gap?: number; op?: number; angle?: number; draw?: number}> = ({
  x,
  y,
  w,
  h,
  seed,
  gap = 9,
  op = 0.45,
  angle = -50,
  draw = 1,
}) => (
  <R
    s={Rc(x, y, w, h)}
    seed={seed}
    o={{...HATCH, stroke: 'none', fill: C.ink, fillStyle: 'hachure', hachureGap: gap, hachureAngle: angle, fillWeight: 0.9}}
    opacity={op}
    draw={draw}
  />
);

/* ------------------------------------------------------------------ */
/* Bubbles                                                            */
/* ------------------------------------------------------------------ */

export const SpeechBubble: React.FC<{x: number; y: number; w: number; h: number; tail: Pt; seed: number; t?: number; children?: React.ReactNode}> = ({
  x,
  y,
  w,
  h,
  tail,
  seed,
  t = 1,
  children,
}) => {
  if (t <= 0) return null;
  const s = 0.6 + 0.4 * E.back(Math.min(1, t));
  const cx = x + w / 2;
  const cy = y + h / 2;
  const bx = Math.max(x + 50, Math.min(x + w - 90, tail[0] - 20));
  const dx = tail[0] - (bx + 20);
  const dy = tail[1] - (y + h);
  const len = Math.hypot(dx, dy) || 1;
  const tl = Math.min(len, 120);
  const tx = bx + 20 + (dx / len) * tl;
  const ty = y + h + (dy / len) * tl;
  const d = `M ${x + 30} ${y} C ${x + w * 0.3} ${y - 8} ${x + w * 0.7} ${y - 8} ${x + w - 30} ${y} C ${x + w + 8} ${y + 6} ${x + w + 8} ${y + h - 6} ${x + w - 30} ${y + h} L ${bx + 44} ${y + h} L ${tx} ${ty} L ${bx} ${y + h} L ${x + 30} ${y + h} C ${x - 8} ${y + h - 6} ${x - 8} ${y + 6} ${x + 30} ${y} Z`;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`} opacity={Math.min(1, t * 3)}>
      <Fill d={d} color={C.cream} op={0.6} seed={seed} f="wcS" knock={C.cream} />
      {children}
    </g>
  );
};

export const ThoughtBubble: React.FC<{x: number; y: number; w: number; h: number; from: Pt; seed: number; t?: number; children?: React.ReactNode}> = ({
  x,
  y,
  w,
  h,
  from,
  seed,
  t = 1,
  children,
}) => {
  if (t <= 0) return null;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const puffs = 9;
  let d = '';
  for (let i = 0; i <= puffs; i++) {
    const a = (i / puffs) * Math.PI * 2;
    const px = cx + Math.cos(a) * w * 0.5;
    const py = cy + Math.sin(a) * h * 0.5;
    if (i === 0) d += `M ${px} ${py} `;
    else {
      const am = ((i - 0.5) / puffs) * Math.PI * 2;
      d += `Q ${cx + Math.cos(am) * w * 0.62} ${cy + Math.sin(am) * h * 0.64} ${px} ${py} `;
    }
  }
  d += 'Z';
  const dots = [0.25, 0.5, 0.72].map((k, i) => ({x: from[0] + (cx - from[0]) * k * 0.62, y: from[1] + (cy + h * 0.45 - from[1]) * k, r: 7 + i * 5}));
  const s = 0.5 + 0.5 * E.back(Math.min(1, t));
  return (
    <g opacity={Math.min(1, t * 3)}>
      {dots.map((p, i) => (
        <g key={i} opacity={ramp(t, i * 0.12, i * 0.12 + 0.15)}>
          <Fill d={ellD(p.x, p.y, p.r, p.r * 0.85)} color={C.cream} op={0.5} seed={seed + 10 + i} f="wcS" knock={C.cream} o={{strokeWidth: 2}} />
        </g>
      ))}
      <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>
        <Fill d={d} color={C.cream} op={0.6} seed={seed} f="wcS" knock={C.cream} />
        {children}
      </g>
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Devices                                                            */
/* ------------------------------------------------------------------ */

/** Laptop in 3/4 view. Origin: front-centre of the base. Screen local box is 0..200 x 0..124. */
export const Laptop: React.FC<{x: number; y: number; s?: number; seed: number; facing?: 1 | -1; screen?: React.ReactNode; glow?: number}> = ({
  x,
  y,
  s = 1,
  seed,
  facing = 1,
  screen,
  glow = 0,
}) => (
  <g transform={`translate(${x} ${y}) scale(${s * facing} ${s})`}>
    <Fill d="M -120 0 L 110 0 L 140 -26 L -96 -26 Z" color={C.inkSoft} op={0.35} seed={seed} f="wcS" />
    <R s={L(-80, -8, 90, -8)} seed={seed + 1} o={THIN} />
    <g transform="translate(-96 -26) skewX(-12)">
      <Fill d={rectD(0, -150, 236, 150, 8)} color={C.inkSoft} op={0.45} seed={seed + 2} f="wcS" />
      <path d={rectD(10, -140, 216, 130, 4)} fill={C.cream} />
      {glow > 0 ? <rect x={10} y={-140} width={216} height={130} fill={C.marigoldTint} opacity={glow * 0.5} /> : null}
      <g transform="translate(18 -134) scale(1)">{screen}</g>
      <R s={Rc(10, -140, 216, 130)} seed={seed + 3} o={THIN} />
    </g>
  </g>
);

/** Phone, portrait. Origin = centre. Local screen box is -18..18 x -34..30. */
export const Phone: React.FC<{x?: number; y?: number; s?: number; seed: number; rot?: number; screen?: React.ReactNode; glow?: number}> = ({
  x = 0,
  y = 0,
  s = 1,
  seed,
  rot = 0,
  screen,
  glow = 0,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    {glow > 0 ? <Bloom cx={0} cy={0} rx={50} ry={60} color={C.marigoldTint} op={glow * 0.6} /> : null}
    <Fill d={rectD(-22, -42, 44, 84, 8)} color={C.ink} op={0.7} seed={seed} f="wcS" o={{strokeWidth: 2.2}} />
    <path d={rectD(-18, -35, 36, 66, 3)} fill={C.cream} />
    {screen}
    <R s={L(-5, 36, 5, 36)} seed={seed + 1} o={{...THIN, stroke: C.cream}} />
  </g>
);

/** The Sajha Kaam app mark: a Dhaka diamond knot. Not a real brand. */
export const AppMark: React.FC<{x: number; y: number; s?: number; seed: number}> = ({x, y, s = 1, seed}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d={rectD(-20, -20, 40, 40, 9)} fill="url(#dhakaS)" />
    <path d="M 0 -13 L 13 0 L 0 13 L -13 0 Z" fill={C.cream} stroke={C.ink} strokeWidth={1.6} />
    <path d="M 0 -6 L 6 0 L 0 6 L -6 0 Z" fill={C.crimson} />
    <R s={P(rectD(-20, -20, 40, 40, 9))} seed={seed} o={{...THIN, strokeWidth: 2}} />
  </g>
);

export const Camera: React.FC<{x?: number; y?: number; s?: number; seed: number; rec?: boolean}> = ({x = 0, y = 0, s = 1, seed, rec}) => {
  const f = useCurrentFrame();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Fill d={rectD(-34, -22, 62, 44, 6)} color={C.ink} op={0.72} seed={seed} f="wcS" />
      <Fill d={rectD(-24, -30, 22, 10, 3)} color={C.ink} op={0.6} seed={seed + 1} f="wcS" />
      <Fill d={ellD(30, 0, 14, 16)} color={C.inkSoft} op={0.5} seed={seed + 2} f="wcS" />
      <circle cx={30} cy={0} r={7} fill={C.pineTint} stroke={C.ink} strokeWidth={1.5} />
      <circle cx={28} cy={-2} r={2} fill={C.cream} />
      {rec && Math.floor(f / 12) % 2 === 0 ? <circle cx={-24} cy={-12} r={4} fill={C.crimson} /> : null}
    </g>
  );
};

export const Cup: React.FC<{x: number; y: number; s?: number; seed: number; steam?: boolean}> = ({x, y, s = 1, seed, steam = true}) => {
  const f = useCurrentFrame();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {steam
        ? [0, 1].map((i) => {
            const ph = (f / 26 + i * 0.5) % 1;
            return (
              <path
                key={i}
                d={`M ${-6 + i * 12} ${-40 - ph * 30} q 6 -8 0 -16 q -6 -8 0 -16`}
                stroke={C.inkSoft}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                opacity={Math.sin(ph * Math.PI) * 0.7}
              />
            );
          })
        : null}
      <Fill d="M -22 -36 L 22 -36 L 18 0 L -18 0 Z" color={C.cream} op={0.7} seed={seed} f="wcS" />
      <Fill d="M -22 -36 L 22 -36 L 21 -26 L -21 -26 Z" color={C.marigold} op={0.6} seed={seed + 3} f="wcS" ink={false} />
      <R s={P('M 21 -28 C 34 -28 34 -10 19 -10')} seed={seed + 1} o={THIN} />
      <R s={El(0, 2, 56, 10)} seed={seed + 2} o={THIN} />
    </g>
  );
};

export const Coin: React.FC<{x: number; y: number; s?: number; seed: number; spin?: number}> = ({x, y, s = 1, seed, spin = 0}) => {
  const w = Math.max(0.15, Math.abs(Math.cos(spin)));
  return (
    <g transform={`translate(${x} ${y}) scale(${s * w} ${s})`}>
      <Bloom cx={0} cy={0} rx={34} ry={34} color={C.marigold} op={0.45} />
      <Fill d={ellD(0, 0, 22, 22)} color={C.marigold} op={0.95} seed={seed} f="wcS" knock={C.marigoldTint} />
      <R s={El(0, 0, 30, 30)} seed={seed + 1} o={THIN} />
      <path d="M 0 -8 L 8 0 L 0 8 L -8 0 Z" fill={C.crimson} opacity={0.8} />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Screens                                                            */
/* ------------------------------------------------------------------ */

/** A blank browser page with a blinking cursor (local box 0..200 x 0..118). */
export const BlankPage: React.FC<{seed: number; cursor?: boolean}> = ({seed, cursor = true}) => {
  const f = useCurrentFrame();
  return (
    <g>
      <R s={Rc(0, 0, 200, 16)} seed={seed} o={{...THIN, strokeWidth: 1.2}} />
      {[8, 18, 28].map((x) => (
        <circle key={x} cx={x} cy={8} r={3} fill="none" stroke={C.ink} strokeWidth={1} />
      ))}
      <R s={Rc(44, 4, 120, 8)} seed={seed + 1} o={{...THIN, strokeWidth: 1}} />
      {cursor && Math.floor(f / 15) % 2 === 0 ? <rect x={20} y={36} width={3} height={18} fill={C.ink} /> : null}
    </g>
  );
};

/** A sketched landing page: hero image, headline bars, button. `p` builds it up 0..1. */
export const SitePage: React.FC<{seed: number; p?: number; video?: boolean}> = ({seed, p = 1, video}) => {
  const bits = [
    <R key="a" s={Rc(0, 0, 200, 16)} seed={seed} o={{...THIN, strokeWidth: 1.2}} />,
    <g key="b">
      <Wash d={rectD(10, 24, 104, 54)} color={C.marigold} op={0.7} f="wcS" />
      <R s={Rc(10, 24, 104, 54)} seed={seed + 1} o={{...THIN, strokeWidth: 1.3}} />
      {video ? <path d="M 54 40 L 74 51 L 54 62 Z" fill={C.cream} stroke={C.ink} strokeWidth={1.4} /> : <Cup x={62} y={72} s={0.8} seed={seed + 2} steam={false} />}
    </g>,
    <R key="c" s={L(124, 32, 188, 32)} seed={seed + 3} o={{...THIN, strokeWidth: 4}} />,
    <R key="d" s={L(124, 46, 176, 46)} seed={seed + 4} o={{...THIN, strokeWidth: 2}} />,
    <R key="e" s={L(124, 56, 182, 56)} seed={seed + 5} o={{...THIN, strokeWidth: 2}} />,
    <g key="f">
      <Wash d={rectD(124, 66, 50, 14, 6)} color={C.crimson} op={0.85} f="wcS" />
      <R s={P(rectD(124, 66, 50, 14, 6))} seed={seed + 6} o={{...THIN, strokeWidth: 1.2}} />
    </g>,
    <g key="g">
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Wash d={rectD(10 + i * 64, 88, 56, 24)} color={[C.pine, C.crimson, C.marigold][i]} op={0.35} f="wcS" />
          <R s={Rc(10 + i * 64, 88, 56, 24)} seed={seed + 7 + i} o={{...THIN, strokeWidth: 1}} />
        </g>
      ))}
    </g>,
  ];
  const n = bits.length;
  return <g>{bits.map((b, i) => (p * n > i ? <g key={i} opacity={Math.min(1, p * n - i)}>{b}</g> : null))}</g>;
};

/** Code-ish lines being typed (Sita's skill). */
export const CodeLines: React.FC<{seed: number; p: number}> = ({seed, p}) => {
  const rows = [
    [10, 70, C.crimson],
    [22, 110, C.pine],
    [22, 90, C.ink],
    [34, 60, C.marigold],
    [22, 120, C.pine],
    [10, 50, C.crimson],
  ] as const;
  return (
    <g>
      {rows.map(([x, w, col], i) => {
        const t = Math.max(0, Math.min(1, p * rows.length - i));
        return t > 0 ? <R key={i} s={L(x, 12 + i * 16, x + w * t, 12 + i * 16)} seed={seed + i} o={{...THIN, stroke: col, strokeWidth: 4}} /> : null;
      })}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Dhaka thread                                                       */
/* ------------------------------------------------------------------ */

/** The Dhaka thread: a woven band whose diamond lattice follows the curve (geometry from Paper.js). */
export const Thread: React.FC<{d: string; p: number; w?: number; seed: number; wobble?: number}> = ({d, p, w = 18, seed, wobble = 0}) => (
  <DhakaBand d={d} p={p} w={w} seed={seed} wobble={wobble} />
);

/** Small Dhaka diamond lattice swatch (accent). */
export const DhakaSwatch: React.FC<{x: number; y: number; w: number; h: number; seed: number}> = ({x, y, w, h, seed}) => (
  <g>
    <path d={rectD(x, y, w, h)} fill="url(#dhaka)" />
    <R s={Rc(x, y, w, h)} seed={seed} o={THIN} />
  </g>
);

/* ------------------------------------------------------------------ */
/* Stamp, record, badge                                               */
/* ------------------------------------------------------------------ */

export const Stars: React.FC<{x: number; y: number; n: number; grow?: number; size?: number; seed: number}> = ({x, y, n, grow = 1, size = 34, seed}) => (
  <g>
    {Array.from({length: n}).map((_, i) => {
      const isNew = i === n - 1;
      const sc = isNew ? E.back(Math.min(1, grow)) : 1;
      if (sc <= 0.01) return null;
      const cx = x + i * size * 1.15;
      const pts: Pt[] = [];
      for (let k = 0; k < 10; k++) {
        const r = k % 2 === 0 ? size / 2 : size / 4.6;
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        pts.push([cx + Math.cos(a) * r, y + Math.sin(a) * r]);
      }
      const d = 'M ' + pts.map((p) => p.join(' ')).join(' L ') + ' Z';
      return (
        <g key={i} transform={`translate(${cx} ${y}) scale(${sc}) translate(${-cx} ${-y})`}>
          <Fill d={d} color={C.marigold} op={0.95} seed={seed + i} f="wcS" knock={C.marigoldTint} o={{strokeWidth: 2}} />
        </g>
      );
    })}
  </g>
);

/* ------------------------------------------------------------------ */
/* Text helpers                                                       */
/* ------------------------------------------------------------------ */

export const Label: React.FC<{x: number; y: number; t: number; children: string; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; rot?: number}> = ({
  x,
  y,
  t,
  children,
  size = 46,
  color = C.ink,
  anchor = 'middle',
  rot = 0,
}) => (
  <HText x={x} y={y} size={size} reveal={t} anchor={anchor} color={color} rot={rot}>
    {children}
  </HText>
);

export const Title: React.FC<{x: number; y: number; size: number; t: number; children: string; color?: string}> = ({x, y, size, t, children, color = C.ink}) => (
  <HText x={x} y={y} size={size} reveal={t} anchor="middle" font={DISPLAY} weight={800} widthFactor={0.6} color={color}>
    {children}
  </HText>
);

export {HAND, Cv, El, L, Ln, P, R, RS, Rc, hn, useBoil, Bloom, Wash, ellD, rectD};
