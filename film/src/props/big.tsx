import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../lib/theme';
import {Bloom, HText, Wash, ellD, rectD} from '../lib/paint';
import {El, L, P, R, RS, Rc} from '../lib/rough';
import {Fill, THIN} from './kit';
import {clamp01} from '../lib/anim';

/** A laptop/browser screen drawn natively at any size (close-ups keep a consistent pen weight). */
export const BigScreen: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  mode: 'blank' | 'code' | 'site' | 'video';
  p?: number;
  seed: number;
  bezel?: boolean;
  lw?: number;
}> = ({x, y, w, h, mode, p = 1, seed, bezel = true, lw = 1}) => {
  const f = useCurrentFrame();
  const u = w / 200;
  const X = (v: number) => x + v * u;
  const Y = (v: number) => y + v * u;
  const t = (k: number) => {
    const n = 7;
    return clamp01(p * n - k);
  };
  const s = lw;
  return (
    <g>
      {bezel ? <Fill d={rectD(x - 18 * s, y - 18 * s, w + 36 * s, h + 36 * s, 14 * s)} color={C.inkSoft} op={0.5} seed={seed} f="wcS" o={{strokeWidth: 3 * s}} /> : null}
      <path d={rectD(x, y, w, h)} fill={C.cream} />
      {/* browser bar */}
      <R s={L(x, y + h * 0.085, x + w, y + h * 0.085)} seed={seed + 1} o={{...THIN, strokeWidth: 2 * s}} />
      {[0.03, 0.06, 0.09].map((k, i) => (
        <circle key={i} cx={x + w * k} cy={y + h * 0.043} r={h * 0.014} fill="none" stroke={C.ink} strokeWidth={1.6 * s} />
      ))}
      <R s={P(rectD(x + w * 0.2, y + h * 0.018, w * 0.55, h * 0.05, h * 0.025))} seed={seed + 2} o={{...THIN, strokeWidth: 1.6 * s}} />
      {mode === 'blank' ? (
        Math.floor(f / 15) % 2 === 0 ? <rect x={X(16)} y={Y(26)} width={4 * s} height={h * 0.1} fill={C.ink} /> : null
      ) : mode === 'code' ? (
        <g>
          {[
            [10, 70, C.crimson],
            [22, 110, C.pine],
            [22, 90, C.ink],
            [34, 60, C.marigold],
            [22, 120, C.pine],
            [34, 80, C.crimson],
            [10, 50, C.ink],
          ].map(([cx, cw, col], i) => {
            const k = t(i);
            return k > 0 ? <R key={i} s={L(X(cx as number), Y(26 + i * 12), X((cx as number) + (cw as number) * k), Y(26 + i * 12))} seed={seed + 10 + i} o={{...THIN, stroke: col as string, strokeWidth: 6 * s}} /> : null;
          })}
          {Math.floor(f / 10) % 2 === 0 ? <rect x={X(10 + 50 * clamp01(p * 7 - 6))} y={Y(96)} width={3 * s} height={14 * s} fill={C.ink} /> : null}
        </g>
      ) : (
        <g>
          <g opacity={t(0)}>
            <Wash d={rectD(X(10), Y(22), 100 * u, 50 * u, 4 * u)} color={C.marigold} op={0.75} f="wcM" />
            <R s={P(rectD(X(10), Y(22), 100 * u, 50 * u, 4 * u))} seed={seed + 20} o={{...THIN, strokeWidth: 2.2 * s}} />
            {mode === 'video' ? (
              <g>
                <circle cx={X(60)} cy={Y(47)} r={14 * u} fill={C.cream} opacity={0.85} />
                <path d={`M ${X(55)} ${Y(39)} L ${X(68)} ${Y(47)} L ${X(55)} ${Y(55)} Z`} fill={C.crimson} stroke={C.ink} strokeWidth={2 * s} strokeLinejoin="round" />
              </g>
            ) : (
              <g>
                <R s={P(`M ${X(46)} ${Y(40)} L ${X(74)} ${Y(40)} L ${X(71)} ${Y(62)} L ${X(49)} ${Y(62)} Z`)} seed={seed + 21} o={{...THIN, strokeWidth: 2.2 * s}} />
                <R s={P(`M ${X(73)} ${Y(44)} C ${X(82)} ${Y(44)} ${X(82)} ${Y(56)} ${X(72)} ${Y(56)}`)} seed={seed + 22} o={{...THIN, strokeWidth: 2.2 * s}} />
                {[0, 1].map((i) => (
                  <path key={i} d={`M ${X(54 + i * 10)} ${Y(36)} q ${3 * u} ${-4 * u} 0 ${-8 * u}`} stroke={C.inkSoft} strokeWidth={2 * s} fill="none" opacity={0.6 + 0.4 * Math.sin(f / 8 + i)} />
                ))}
              </g>
            )}
          </g>
          <R s={L(X(120), Y(30), X(120 + 66 * t(1)), Y(30))} seed={seed + 23} o={{...THIN, strokeWidth: 9 * s}} />
          <R s={L(X(120), Y(44), X(120 + 54 * t(2)), Y(44))} seed={seed + 24} o={{...THIN, strokeWidth: 3.5 * s}} />
          <R s={L(X(120), Y(53), X(120 + 60 * t(2)), Y(53))} seed={seed + 25} o={{...THIN, strokeWidth: 3.5 * s}} />
          <g opacity={t(3)}>
            <Wash d={rectD(X(120), Y(62), 46 * u, 12 * u, 6 * u)} color={C.crimson} op={0.9} f="wcS" />
            <R s={P(rectD(X(120), Y(62), 46 * u, 12 * u, 6 * u))} seed={seed + 26} o={{...THIN, strokeWidth: 2 * s}} />
          </g>
          {[0, 1, 2].map((i) => (
            <g key={i} opacity={t(4 + i * 0.6)}>
              <Wash d={rectD(X(10 + i * 64), Y(82), 56 * u, 24 * u, 3 * u)} color={[C.pine, C.crimson, C.marigold][i]} op={0.35} f="wcS" />
              <R s={P(rectD(X(10 + i * 64), Y(82), 56 * u, 24 * u, 3 * u))} seed={seed + 27 + i} o={{...THIN, strokeWidth: 1.8 * s}} />
            </g>
          ))}
        </g>
      )}
      <R s={Rc(x, y, w, h)} seed={seed + 40} o={{...THIN, strokeWidth: 2.4 * s}} />
    </g>
  );
};

/** A big phone drawn natively. Children are drawn in screen coordinates; the screen rect is provided via render prop. */
export const BigPhone: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
  rot?: number;
  glow?: number;
  children?: (sx: number, sy: number, sw: number, sh: number) => React.ReactNode;
  draw?: number;
}> = ({x, y, w, h, seed, rot = 0, glow = 0, children, draw = 1}) => {
  const pad = w * 0.06;
  const sx = x + pad;
  const sy = y + pad * 1.8;
  const sw = w - pad * 2;
  const sh = h - pad * 3.4;
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
      {glow > 0 ? <Bloom cx={x + w / 2} cy={y + h / 2} rx={w * 0.9} ry={h * 0.7} color={C.marigoldTint} op={glow * 0.7} /> : null}
      <Fill d={rectD(x, y, w, h, w * 0.14)} color={C.ink} op={0.78} seed={seed} f="wcM" o={{strokeWidth: 3}} draw={draw} />
      <g opacity={clamp01(draw * 2 - 1)}>
        <path d={rectD(sx, sy, sw, sh, w * 0.05)} fill={C.cream} />
        <rect x={x + w / 2 - w * 0.12} y={y + pad * 0.6} width={w * 0.24} height={pad * 0.6} rx={pad * 0.3} fill={C.paper} opacity={0.5} />
        {children ? children(sx, sy, sw, sh) : null}
        <R s={P(rectD(sx, sy, sw, sh, w * 0.05))} seed={seed + 1} o={{...THIN, strokeWidth: 2}} />
      </g>
    </g>
  );
};

/** Laptop seen straight-on. The screen rect is (sx, sy, sw, sh); the base sits under it. */
export const LaptopFront: React.FC<{sx: number; sy: number; sw: number; sh: number; seed: number; draw?: number}> = ({sx, sy, sw, sh, seed, draw = 1}) => (
  <g>
    <Fill d={rectD(sx - 14, sy - 14, sw + 28, sh + 28, 10)} color={C.inkSoft} op={0.5} seed={seed} f="wcS" draw={draw} />
    <Fill d={`M ${sx - 40} ${sy + sh + 14} L ${sx + sw + 40} ${sy + sh + 14} L ${sx + sw + 60} ${sy + sh + 34} L ${sx - 60} ${sy + sh + 34} Z`} color={C.inkSoft} op={0.4} seed={seed + 1} f="wcS" draw={draw} />
  </g>
);

/** A hand holding something, seen from the side: four fingers wrapping an edge. */
export const HoldingHand: React.FC<{x: number; y: number; s?: number; skin: string; seed: number; flip?: boolean}> = ({x, y, s = 1, skin, seed, flip}) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
    <Fill d="M -30 60 C -40 20 -30 -10 -6 -14 L 30 -10 C 40 -8 40 6 30 8 L 10 10 L 28 14 C 38 16 38 30 28 30 L 8 30 L 24 34 C 34 36 34 50 24 50 L 0 50 C -6 70 -10 90 -14 120 L -40 120 Z" color={skin} op={0.85} seed={seed} f="wcS" />
    <R s={P('M -2 10 L 10 10 M -2 30 L 8 30')} seed={seed + 1} o={{...THIN, strokeWidth: 1.6}} />
  </g>
);

/** The Sajha Kaam app home, drawn as a sketch (no real UI). Screen-space. */
export const AppHome: React.FC<{sx: number; sy: number; sw: number; sh: number; p: number; seed: number}> = ({sx, sy, sw, sh, p, seed}) => {
  const k = (i: number) => clamp01(p * 5 - i);
  const cx = sx + sw / 2;
  return (
    <g>
      <g opacity={k(0)} transform={`translate(${cx} ${sy + sh * 0.3}) scale(${0.6 + 0.4 * k(0)})`}>
        <path d={rectD(-70, -70, 140, 140, 30)} fill="url(#dhaka)" />
        <path d="M 0 -46 L 46 0 L 0 46 L -46 0 Z" fill={C.cream} stroke={C.ink} strokeWidth={3} />
        <path d="M 0 -22 L 22 0 L 0 22 L -22 0 Z" fill={C.crimson} />
        <R s={P(rectD(-70, -70, 140, 140, 30))} seed={seed} o={{...THIN, strokeWidth: 3}} />
      </g>
      <HText x={cx} y={sy + sh * 0.56} size={sw * 0.15} anchor="middle" reveal={k(1)} weight={700}>
        Sajha Kaam
      </HText>
      <HText x={cx} y={sy + sh * 0.66} size={sw * 0.1} anchor="middle" reveal={k(2)} color={C.crimson} weight={400}>
        साझा काम
      </HText>
      {[0, 1].map((i) => (
        <g key={i} opacity={k(3 + i * 0.6)}>
          <Wash d={rectD(sx + sw * 0.12, sy + sh * (0.74 + i * 0.1), sw * 0.76, sh * 0.07, 10)} color={i ? C.pine : C.crimson} op={0.8} f="wcS" />
          <R s={P(rectD(sx + sw * 0.12, sy + sh * (0.74 + i * 0.1), sw * 0.76, sh * 0.07, 10))} seed={seed + 5 + i} o={{...THIN, strokeWidth: 2}} />
        </g>
      ))}
    </g>
  );
};

export {El, RS, ellD};
