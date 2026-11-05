import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../lib/theme';
import {Bloom, HText, Wash, ellD, rectD} from '../lib/paint';
import {Cv, El, L, Ln, P, R, RS, Rc, Shape} from '../lib/rough';
import {Cup, Fill, Hatch, OUT, THIN} from './kit';
import {clamp01, hn} from '../lib/anim';

const st = (draw: number, i: number, n: number, spread = 0.6) => clamp01((draw - (i / n) * spread) / (1 - spread));

/* ------------------------------------------------------------------ */
/* Melbourne                                                          */
/* ------------------------------------------------------------------ */

const TOWERS = [
  {x: 0, w: 90, h: 300, k: 0},
  {x: 100, w: 70, h: 420, k: 1},
  {x: 180, w: 110, h: 360, k: 0},
  {x: 300, w: 80, h: 560, k: 2}, // gold-topped tower
  {x: 392, w: 120, h: 330, k: 0},
  {x: 520, w: 70, h: 470, k: 1},
  {x: 600, w: 46, h: 640, k: 3}, // lattice spire
  {x: 660, w: 130, h: 280, k: 0},
  {x: 800, w: 90, h: 400, k: 1},
  {x: 900, w: 110, h: 320, k: 0},
];

export const Skyline: React.FC<{x: number; y: number; s?: number; draw?: number; seed?: number; far?: boolean}> = ({x, y, s = 1, draw = 1, seed = 1000, far}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={far ? 0.55 : 1}>
    {TOWERS.map((t, i) => {
      const d = st(draw, i, TOWERS.length);
      if (d <= 0) return null;
      const top = -t.h;
      const shape =
        t.k === 3
          ? `M ${t.x + t.w / 2} ${top} L ${t.x + t.w} ${top + 260} L ${t.x + t.w} 0 L ${t.x} 0 L ${t.x} ${top + 260} Z`
          : t.k === 2
            ? `M ${t.x} ${top + 30} L ${t.x + t.w * 0.7} ${top} L ${t.x + t.w} ${top + 20} L ${t.x + t.w} 0 L ${t.x} 0 Z`
            : rectD(t.x, top, t.w, t.h);
      const wins: Shape[] = [];
      if (t.k !== 3) {
        for (let r = top + 40; r < -30; r += 34) wins.push(L(t.x + 12, r, t.x + t.w - 12, r));
      } else {
        for (let r = top + 60; r < top + 250; r += 28) wins.push(L(t.x + t.w / 2 - (r - top) * 0.09, r, t.x + t.w / 2 + (r - top) * 0.09, r - 14));
      }
      return (
        <g key={i}>
          <Fill d={shape} color={i % 3 === 0 ? C.pineTint : C.sage} op={far ? 0.5 : 0.55} seed={seed + i * 7} f="wcM" draw={d} o={{strokeWidth: 2.2}} />
          {t.k === 2 ? <Wash d={`M ${t.x} ${top + 30} L ${t.x + t.w * 0.7} ${top} L ${t.x + t.w} ${top + 20} L ${t.x + t.w} ${top + 70} L ${t.x} ${top + 80} Z`} color={C.marigold} op={0.85} f="wcS" reveal={d} /> : null}
          <RS shapes={wins} seed={seed + i * 7 + 3} o={{...THIN, strokeWidth: 1.1}} draw={d} opacity={0.6} />
          {i % 2 === 1 ? <Hatch x={t.x + t.w * 0.66} y={top + 20} w={t.w * 0.3} h={t.h - 20} seed={seed + i} draw={d} op={0.35} /> : null}
        </g>
      );
    })}
  </g>
);

export const Sun: React.FC<{x: number; y: number; r?: number; t?: number; seed?: number}> = ({x, y, r = 70, t = 1, seed = 1100}) => (
  <g opacity={t}>
    <Bloom cx={x} cy={y} rx={r * 2.6} ry={r * 2.2} color={C.marigoldTint} op={0.55} />
    <Wash d={ellD(x, y, r, r)} color={C.marigold} op={0.75} f="wcM" />
    <R s={El(x, y, r * 2, r * 2)} seed={seed} o={{...THIN, strokeWidth: 2}} draw={t} />
  </g>
);

export const Gulls: React.FC<{x: number; y: number; seed: number; n?: number}> = ({x, y, seed, n = 3}) => {
  const f = useCurrentFrame();
  return (
    <g>
      {Array.from({length: n}).map((_, i) => {
        const gx = x + i * 70 + f * 0.8;
        const gy = y + hn(i) * 30 + Math.sin(f / 9 + i) * 5;
        const flap = Math.sin(f / 4 + i * 2) * 7;
        return <path key={i} d={`M ${gx - 16} ${gy + flap} Q ${gx - 8} ${gy - 8} ${gx} ${gy} Q ${gx + 8} ${gy - 8} ${gx + 16} ${gy + flap}`} stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />;
      })}
    </g>
  );
};

/** Harbour Café storefront. Origin: bottom-left at street level. Size ~ 680 x 560. */
export const CafeFront: React.FC<{x: number; y: number; s?: number; draw?: number; seed?: number; busy?: number}> = ({x, y, s = 1, draw = 1, seed = 1200, busy = 0}) => {
  const f = useCurrentFrame();
  const scallop = Array.from({length: 12})
    .map((_, i) => `Q ${30 + i * 52 + 26} ${-330} ${30 + (i + 1) * 52} ${-352}`)
    .join(' ');
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* building */}
      <Fill d={rectD(0, -560, 680, 560)} color={C.marigoldTint} op={0.42} seed={seed} f="wcL" draw={st(draw, 0, 8)} />
      {/* upstairs windows */}
      {[90, 290, 490].map((wx, i) => (
        <g key={wx}>
          <Fill d={rectD(wx, -520, 100, 110)} color={C.pineTint} op={0.4} seed={seed + 10 + i} f="wcS" draw={st(draw, 1, 8)} />
          <R s={L(wx + 50, -520, wx + 50, -410)} seed={seed + 20 + i} o={THIN} draw={st(draw, 1, 8)} />
          <Hatch x={wx + 6} y={-514} w={40} h={60} seed={seed + 30 + i} draw={st(draw, 1, 8)} op={0.25} />
        </g>
      ))}
      {/* fascia sign */}
      <Fill d={rectD(20, -400, 640, 64)} color={C.pine} op={0.85} seed={seed + 40} f="wcM" draw={st(draw, 2, 8)} />
      <HText x={340} y={-352} size={42} anchor="middle" color={C.cream} reveal={st(draw, 3, 8)}>
        Harbour Café
      </HText>
      {/* awning */}
      {Array.from({length: 14}).map((_, i) => (
        <Fill key={`sc${i}`} d={`M ${-2 + i * 49} -300 Q ${22 + i * 49} -270 ${47 + i * 49} -300 Z`} color={i % 2 ? C.cream : C.crimson} op={0.8} seed={seed + 100 + i} f="wcS" draw={st(draw, 5, 8)} o={{strokeWidth: 1.8}} />
      ))}
      <Fill d={`M 10 -336 L 670 -336 L 682 -300 L -2 -300 Z`} color={C.cream} op={0.5} seed={seed + 51} f="wcS" draw={st(draw, 4, 8)} />
      {Array.from({length: 7}).map((_, i) => (
        <Wash key={i} d={`M ${10 + i * 96} -336 L ${58 + i * 96} -336 L ${60 + i * 98} -300 L ${8 + i * 98} -300 Z`} color={C.crimson} op={0.8} f="wcS" reveal={st(draw, 5, 8)} />
      ))}
      <R s={P('M -2 -300 L 682 -300')} seed={seed + 52} o={OUT} draw={st(draw, 4, 8)} />
      {/* window */}
      <Fill d={rectD(30, -290, 400, 230)} color={C.pineTint} op={0.28} seed={seed + 60} f="wcM" draw={st(draw, 5, 8)} />
      <RS shapes={[L(80, -270, 140, -200), L(100, -270, 170, -190), L(300, -200, 360, -120)]} seed={seed + 61} o={{...THIN, stroke: C.cream, strokeWidth: 3}} draw={st(draw, 6, 8)} />
      <R s={L(30, -150, 430, -150)} seed={seed + 62} o={THIN} draw={st(draw, 6, 8)} />
      {busy > 0 ? (
        <g opacity={busy}>
          {[90, 170, 260, 350].map((cx, i) => (
            <g key={cx}>
              <Fill d={ellD(cx, -186 + Math.sin(f / 10 + i) * 2, 20, 23)} color={['#E8BE9A', '#B47650', '#C48A62', '#9C6644'][i]} op={0.75} seed={seed + 70 + i} f="wcS" />
              <Fill d={`M ${cx - 30} -150 C ${cx - 28} -170 ${cx + 28} -170 ${cx + 30} -150 Z`} color={[C.crimsonTint, C.pineTint, C.marigold, C.sage][i]} op={0.7} seed={seed + 80 + i} f="wcS" />
            </g>
          ))}
        </g>
      ) : null}
      {/* lettering on glass */}
      <Cup x={230} y={-200} s={1.1} seed={seed + 63} steam={false} />
      {/* door */}
      <Fill d={rectD(480, -290, 150, 290)} color={C.pine} op={0.7} seed={seed + 64} f="wcM" draw={st(draw, 6, 8)} />
      <Fill d={rectD(500, -270, 110, 140)} color={C.pineTint} op={0.35} seed={seed + 65} f="wcS" draw={st(draw, 7, 8)} />
      <R s={El(600, -130, 12, 12)} seed={seed + 66} o={THIN} draw={st(draw, 7, 8)} />
      {/* planter + a-frame */}
      <Fill d="M 440 -10 L 470 -10 L 466 -60 L 444 -60 Z" color={C.crimson} op={0.6} seed={seed + 67} f="wcS" draw={st(draw, 7, 8)} />
      <Fill d="M 455 -60 C 430 -90 440 -120 455 -110 C 470 -130 482 -96 455 -60 Z" color={C.pine} op={0.7} seed={seed + 68} f="wcS" draw={st(draw, 7, 8)} />
      <R s={Ln([0, 0], [700, 0])} seed={seed + 69} o={OUT} draw={draw} />
    </g>
  );
};

/** Café interior back wall + counter. Counter top at y. */
export const CafeInterior: React.FC<{y: number; draw?: number; seed?: number; x0?: number; x1?: number; part?: 'wall' | 'counter' | 'all'; cx0?: number}> = ({y, draw = 1, seed = 1300, x0 = -200, x1 = 2200, part = 'all', cx0}) => (
  <g>
    {part !== 'counter' ? (<>
    {/* wall */}
    <Wash d={rectD(x0, -400, x1 - x0, y + 640)} color={C.marigoldTint} op={0.28} f="wcL" reveal={draw} />
    {/* shelves */}
    {[220, 330].map((sy, i) => (
      <g key={sy}>
        <R s={L(x0 + 1300, sy, x0 + 2000, sy)} seed={seed + i} o={OUT} draw={draw} />
        {Array.from({length: 6}).map((_, j) => (
          <Fill key={j} d={rectD(x0 + 1330 + j * 110, sy - 50 + (j % 2) * 10, 44, 50 - (j % 2) * 10, 6)} color={[C.crimson, C.pine, C.marigold][(i + j) % 3]} op={0.5} seed={seed + 10 + i * 10 + j} f="wcS" draw={draw} o={{strokeWidth: 1.8}} />
        ))}
      </g>
    ))}
    {/* menu board */}
    <Fill d={rectD(x0 + 450, 120, 380, 230)} color={C.pine} op={0.8} seed={seed + 40} f="wcM" draw={draw} />
    <RS shapes={[L(x0 + 490, 170, x0 + 640, 170), L(x0 + 490, 210, x0 + 700, 210), L(x0 + 490, 250, x0 + 620, 250), L(x0 + 490, 290, x0 + 680, 290)]} seed={seed + 41} o={{...THIN, stroke: C.cream, strokeWidth: 2.4}} draw={draw} />
    <Cup x={x0 + 760} y={300} s={1} seed={seed + 42} steam={false} />
    {/* pendant lamps */}
    {[x0 + 1000, x0 + 1700].map((lx, i) => (
      <g key={lx}>
        <R s={L(lx, -400, lx, 90)} seed={seed + 50 + i} o={THIN} draw={draw} />
        <Bloom cx={lx} cy={150} rx={120} ry={90} color={C.marigoldTint} op={0.45} />
        <Fill d={`M ${lx - 50} 130 C ${lx - 46} 96 ${lx + 46} 96 ${lx + 50} 130 Z`} color={C.marigold} op={0.8} seed={seed + 52 + i} f="wcS" draw={draw} />
      </g>
    ))}
    </>) : null}
    {part !== 'wall' ? (<>
    {/* counter: soft brick front with shading under the lip and wood-grain strokes */}
    <defs>
      <linearGradient id={`ctr${seed}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={C.crimsonDeep} stopOpacity={0.28} />
        <stop offset="0.12" stopColor={C.crimson} stopOpacity={0.16} />
        <stop offset="1" stopColor={C.crimsonSoft} stopOpacity={0.5} />
      </linearGradient>
    </defs>
    <path d={rectD(cx0 ?? x0, y, x1 - (cx0 ?? x0), 600)} fill={C.cream} />
    <path d={rectD(cx0 ?? x0, y, x1 - (cx0 ?? x0), 600)} fill={`url(#ctr${seed})`} />
    <Wash d={rectD((cx0 ?? x0) + 20, y + 40, x1 - (cx0 ?? x0) - 40, 300)} color={C.crimsonSoft} op={0.5} f="wcL" reveal={draw} />
    <RS
      shapes={Array.from({length: 9}).map((_, i) => P(`M ${(cx0 ?? x0) + 30} ${y + 70 + i * 52} C ${(cx0 ?? x0) + 400} ${y + 60 + i * 52 + (i % 2 ? 8 : -8)} ${x1 - 400} ${y + 80 + i * 52} ${x1 - 30} ${y + 70 + i * 52}`))}
      seed={seed + 70}
      o={{...THIN, strokeWidth: 1, stroke: C.crimsonDeep, roughness: 1.6}}
      draw={draw}
      opacity={0.18}
    />
    <R s={L(cx0 ?? x0, y, x1, y)} seed={seed + 63} o={OUT} draw={draw} />
    <Fill d={rectD(cx0 ?? x0, y - 20, x1 - (cx0 ?? x0), 26)} color={C.marigold} op={0.55} seed={seed + 61} f="wcM" draw={draw} />
    <RS shapes={Array.from({length: 14}).map((_, i) => L((cx0 ?? x0) + 80 + i * 170, y + 20, (cx0 ?? x0) + 80 + i * 170, y + 600)).filter((_, i) => (cx0 ?? x0) + 80 + i * 170 < x1)} seed={seed + 62} o={{...THIN, strokeWidth: 1.2}} draw={draw} opacity={0.6} />
    </>) : null}
  </g>
);

export const Espresso: React.FC<{x: number; y: number; s?: number; seed?: number; draw?: number}> = ({x, y, s = 1, seed = 1400, draw = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Fill d={rectD(-110, -200, 220, 200, 12)} color={C.inkSoft} op={0.35} seed={seed} f="wcM" draw={draw} />
    <Fill d={rectD(-110, -230, 220, 34, 8)} color={C.crimson} op={0.7} seed={seed + 1} f="wcS" draw={draw} />
    <Fill d={rectD(-70, -150, 50, 26, 4)} color={C.ink} op={0.5} seed={seed + 2} f="wcS" draw={draw} />
    <Fill d={rectD(20, -150, 50, 26, 4)} color={C.ink} op={0.5} seed={seed + 3} f="wcS" draw={draw} />
    <R s={El(-60, -175, 18, 18)} seed={seed + 4} o={THIN} draw={draw} />
    <R s={El(60, -175, 18, 18)} seed={seed + 5} o={THIN} draw={draw} />
    <Cup x={-45} y={-28} s={0.8} seed={seed + 6} />
  </g>
);

/* ------------------------------------------------------------------ */
/* Sea                                                                */
/* ------------------------------------------------------------------ */

/**
 * The sea: an organic body with curved shorelines, wave bands, and a feathered mask so every edge
 * dissolves into the set (an ocean, not a table).
 */
export const Sea: React.FC<{x: number; y: number; w: number; seed?: number; draw?: number}> = ({x, y, w, seed = 1500, draw = 1}) => {
  const f = useCurrentFrame();
  const id = React.useId().replace(/:/g, '');
  const rows = 6;
  const h = 520;
  // shoreline bulges in at both ends and wanders along the top
  let top = `M ${x - 40} ${y + 40} C ${x + 20} ${y - 4} ${x + 80} ${y} ${x + 140} ${y}`;
  for (let i = 1; i <= 6; i++) {
    const xx = x + 140 + ((w - 280) * i) / 6;
    top += ` S ${xx - (w - 280) / 12} ${y + (i % 2 ? -6 : 6)} ${xx} ${y}`;
  }
  const body = `${top} C ${x + w - 60} ${y} ${x + w + 30} ${y + 20} ${x + w + 50} ${y + 60} C ${x + w + 90} ${y + 200} ${x + w + 40} ${y + h} ${x + w} ${y + h} L ${x} ${y + h} C ${x - 60} ${y + h - 80} ${x - 90} ${y + 160} ${x - 40} ${y + 40} Z`;
  return (
    <g>
      <defs>
        <linearGradient id={`sx${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.12" stopColor="#fff" stopOpacity={1} />
          <stop offset="0.88" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`sy${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={1} />
          <stop offset="0.55" stopColor="#fff" stopOpacity={0.9} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id={`sm${id}`} maskUnits="userSpaceOnUse" x={x - 200} y={y - 60} width={w + 400} height={h + 120}>
          <rect x={x - 200} y={y - 60} width={w + 400} height={h + 120} fill={`url(#sx${id})`} />
        </mask>
        <mask id={`sv${id}`} maskUnits="userSpaceOnUse" x={x - 200} y={y - 60} width={w + 400} height={h + 120}>
          <rect x={x - 200} y={y - 60} width={w + 400} height={h + 120} fill={`url(#sy${id})`} />
        </mask>
      </defs>
      <g mask={`url(#sv${id})`}>
        <Wash d={body} color={C.pineTint} op={0.5} f="wcL" reveal={draw} />
        <Wash d={ellD(x + w / 2, y + h * 0.62, w * 0.36, h * 0.34)} color={C.pine} op={0.12} f="wcL" reveal={draw} />
        <g mask={`url(#sm${id})`}>
          {Array.from({length: rows}).map((_, r) => {
            const yy = y + 34 + r * 58;
            const inset = 60 + r * 18;
            const n = Math.max(2, Math.floor((w - inset * 2) / 90));
            const pts: [number, number][] = [];
            for (let i = 0; i <= n; i++) pts.push([x + inset + i * ((w - inset * 2) / n) + Math.sin(f / 30 + r + i) * 6, yy + (i % 2 ? -8 : 8)]);
            return <R key={r} s={Cv(...pts)} seed={seed + r} o={{...THIN, strokeWidth: 1.6 + r * 0.15, stroke: C.pine}} draw={clamp01(draw * 1.4 - r * 0.08)} opacity={0.55 - r * 0.05} />;
          })}
        </g>
      </g>
      {/* shoreline ink only along the top edge */}
      <R s={P(top)} seed={seed + 20} o={{...THIN, strokeWidth: 1.8}} draw={draw} opacity={0.7} />
    </g>
  );
};

export const Ship: React.FC<{x: number; y: number; s?: number; seed?: number}> = ({x, y, s = 1, seed = 1600}) => {
  const f = useCurrentFrame();
  return (
    <g transform={`translate(${x} ${y + Math.sin(f / 14) * 4}) rotate(${Math.sin(f / 18) * 2}) scale(${s})`}>
      <Fill d="M -90 0 L 90 0 L 70 34 L -74 34 Z" color={C.crimson} op={0.7} seed={seed} f="wcS" />
      <Fill d="M -50 0 L -50 -40 L 30 -40 L 40 0 Z" color={C.cream} op={0.6} seed={seed + 1} f="wcS" />
      <Fill d="M -20 -40 L -20 -70 L 0 -70 L 0 -40 Z" color={C.marigold} op={0.8} seed={seed + 2} f="wcS" />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Nepal                                                              */
/* ------------------------------------------------------------------ */

/** Himalaya with a fishtail peak. Origin: left at base line. Width ~1900. */
export const Mountains: React.FC<{x: number; y: number; s?: number; seed?: number; draw?: number}> = ({x, y, s = 1, seed = 1700, draw = 1}) => {
  const ridge = 'M 0 0 L 180 -220 L 260 -160 L 420 -380 L 520 -270 L 640 -520 L 690 -470 L 720 -600 L 800 -430 L 900 -330 L 1060 -460 L 1200 -260 L 1340 -380 L 1500 -200 L 1640 -300 L 1900 0 Z';
  const snow = 'M 590 -440 L 640 -520 L 690 -470 L 720 -600 L 760 -500 L 730 -470 L 700 -440 L 670 -458 L 640 -430 L 615 -450 Z M 380 -330 L 420 -380 L 470 -322 L 440 -330 L 420 -312 Z M 1020 -410 L 1060 -460 L 1110 -390 L 1080 -400 L 1060 -380 Z M 1310 -350 L 1340 -380 L 1380 -330 L 1350 -336 Z';
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Bloom cx={950} cy={-300} rx={900} ry={260} color={C.pineTint} op={0.25} />
      <Fill d={ridge} color={C.pineTint} op={0.5} seed={seed} f="wcL" draw={draw} o={{strokeWidth: 2.4}} />
      <Wash d={snow} color={C.cream} op={0.95} f="wcM" reveal={draw} />
      <R s={P(snow)} seed={seed + 1} o={{...THIN, strokeWidth: 1.4}} draw={draw} />
      <Hatch x={730} y={-560} w={70} h={320} seed={seed + 2} draw={draw} op={0.22} angle={-30} />
      <Hatch x={1080} y={-420} w={90} h={300} seed={seed + 3} draw={draw} op={0.2} angle={-30} />
      {/* foothills */}
      <Fill d="M -40 0 C 200 -130 360 -90 520 -140 C 700 -200 860 -90 1060 -130 C 1260 -170 1500 -80 1700 -60 C 1820 -50 1900 -20 1940 0 Z" color={C.pine} op={0.3} seed={seed + 4} f="wcL" draw={draw} knock={false} />
    </g>
  );
};

export const House: React.FC<{x: number; y: number; s?: number; seed: number; roof?: string; wall?: string; draw?: number}> = ({x, y, s = 1, seed, roof = C.crimson, wall = C.cream, draw = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Fill d={rectD(-50, -90, 100, 90)} color={wall} op={0.6} seed={seed} f="wcS" draw={draw} />
    <Fill d="M -62 -86 L 0 -138 L 62 -86 Z" color={roof} op={0.7} seed={seed + 1} f="wcS" draw={draw} />
    <Fill d={rectD(-14, -50, 28, 50)} color={C.pine} op={0.6} seed={seed + 2} f="wcS" draw={draw} />
    <R s={Rc(-40, -76, 18, 18)} seed={seed + 3} o={THIN} draw={draw} />
    <R s={Rc(22, -76, 18, 18)} seed={seed + 4} o={THIN} draw={draw} />
  </g>
);

export const PrayerFlags: React.FC<{x1: number; y1: number; x2: number; y2: number; seed: number; draw?: number}> = ({x1, y1, x2, y2, seed, draw = 1}) => {
  const f = useCurrentFrame();
  const n = 11;
  const cols = [C.crimson, C.marigold, C.pine, C.cream, C.crimsonTint];
  const sag = 60;
  return (
    <g>
      <R s={P(`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag * 2} ${x2} ${y2}`)} seed={seed} o={THIN} draw={draw} />
      {Array.from({length: n}).map((_, i) => {
        const t = (i + 0.5) / n;
        if (t > draw) return null;
        const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2;
        const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * ((y1 + y2) / 2 + sag * 2) + t * t * y2;
        const flap = Math.sin(f / 7 + i) * 4;
        return (
          <g key={i}>
            <Wash d={`M ${px - 12} ${py} L ${px + 12} ${py} L ${px + 12 + flap} ${py + 30} L ${px - 12 + flap} ${py + 30} Z`} color={cols[i % 5]} op={0.85} f="wcS" />
            <path d={`M ${px - 12} ${py} L ${px + 12} ${py} L ${px + 12 + flap} ${py + 30} L ${px - 12 + flap} ${py + 30} Z`} fill="none" stroke={C.ink} strokeWidth={1.2} />
          </g>
        );
      })}
    </g>
  );
};

export const Lake: React.FC<{x: number; y: number; w: number; seed?: number; draw?: number}> = ({x, y, w, seed = 1800, draw = 1}) => {
  const f = useCurrentFrame();
  return (
    <g>
      <Fill d={`M ${x} ${y} C ${x + w * 0.2} ${y - 30} ${x + w * 0.8} ${y - 30} ${x + w} ${y} C ${x + w * 0.85} ${y + 70} ${x + w * 0.15} ${y + 70} ${x} ${y} Z`} color={C.pineTint} op={0.55} seed={seed} f="wcL" draw={draw} />
      <RS shapes={[L(x + w * 0.2, y + 10, x + w * 0.4, y + 10), L(x + w * 0.5, y + 26, x + w * 0.75, y + 26), L(x + w * 0.3, y + 40, x + w * 0.45, y + 40)]} seed={seed + 1} o={THIN} draw={draw} opacity={0.6} />
      <g transform={`translate(${x + w * 0.62 + Math.sin(f / 30) * 6} ${y + 14})`}>
        <Fill d="M -40 0 L 40 0 L 30 14 L -30 14 Z" color={C.marigold} op={0.8} seed={seed + 2} f="wcS" draw={draw} />
      </g>
    </g>
  );
};

/** Boudha-style stupa. Origin at base centre. */
export const Stupa: React.FC<{x: number; y: number; s?: number; seed?: number; draw?: number}> = ({x, y, s = 1, seed = 1900, draw = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Fill d={rectD(-210, -40, 420, 40)} color={C.cream} op={0.6} seed={seed} f="wcM" draw={st(draw, 0, 6)} />
    <Fill d="M -170 -40 C -170 -170 170 -170 170 -40 Z" color={C.cream} op={0.7} seed={seed + 1} f="wcM" draw={st(draw, 1, 6)} />
    <Fill d={rectD(-46, -200, 92, 56)} color={C.marigoldTint} op={0.8} seed={seed + 2} f="wcS" draw={st(draw, 2, 6)} />
    {/* eyes */}
    <g opacity={st(draw, 3, 6)}>
      <path d="M -34 -176 Q -22 -186 -10 -176 Q -22 -170 -34 -176 Z" fill={C.ink} />
      <path d="M 10 -176 Q 22 -186 34 -176 Q 22 -170 10 -176 Z" fill={C.ink} />
      <path d="M -2 -166 Q 4 -160 0 -152" stroke={C.ink} strokeWidth={2.4} fill="none" />
    </g>
    <Fill d="M -40 -200 L 40 -200 L 10 -380 L -10 -380 Z" color={C.marigold} op={0.85} seed={seed + 3} f="wcS" draw={st(draw, 4, 6)} />
    <RS shapes={Array.from({length: 10}).map((_, i) => L(-38 + i * 3, -214 - i * 16, 38 - i * 3, -214 - i * 16))} seed={seed + 4} o={{...THIN, strokeWidth: 1.2}} draw={st(draw, 4, 6)} />
    <Fill d="M -22 -380 C -22 -400 22 -400 22 -380 Z" color={C.marigold} op={0.9} seed={seed + 5} f="wcS" draw={st(draw, 5, 6)} />
    <R s={L(0, -400, 0, -440)} seed={seed + 6} o={OUT} draw={st(draw, 5, 6)} />
    <PrayerFlags x1={0} y1={-400} x2={-420} y2={-40} seed={seed + 7} draw={st(draw, 5, 6)} />
    <PrayerFlags x1={0} y1={-400} x2={420} y2={-40} seed={seed + 8} draw={st(draw, 5, 6)} />
  </g>
);

export const Pagoda: React.FC<{x: number; y: number; s?: number; seed?: number; draw?: number}> = ({x, y, s = 1, seed = 2000, draw = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[0, 1, 2].map((i) => {
      const w = 160 - i * 40;
      const by = -i * 110;
      return (
        <g key={i}>
          <Fill d={rectD(-w / 2 + 20, by - 90, w - 40, 90)} color={C.crimson} op={0.55} seed={seed + i * 3} f="wcS" draw={st(draw, i, 4)} />
          <Fill d={`M ${-w / 2 - 30} ${by - 80} L ${w / 2 + 30} ${by - 80} L ${w / 2 - 20} ${by - 120} L ${-w / 2 + 20} ${by - 120} Z`} color={C.ink} op={0.55} seed={seed + i * 3 + 1} f="wcS" draw={st(draw, i + 1, 4)} />
        </g>
      );
    })}
    <Fill d="M -14 -340 L 14 -340 L 0 -390 Z" color={C.marigold} op={0.9} seed={seed + 20} f="wcS" draw={draw} />
  </g>
);

/** Notice board with one big notice. */
export const NoticeBoard: React.FC<{x: number; y: number; s?: number; seed?: number; draw?: number; stamp?: number; ok?: number}> = ({x, y, s = 1, seed = 2100, draw = 1, stamp = 1, ok = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <R s={L(-200, 0, -200, 340)} seed={seed + 90} o={OUT} draw={draw} />
    <R s={L(200, 0, 200, 340)} seed={seed + 91} o={OUT} draw={draw} />
    <Fill d={rectD(-240, -320, 480, 330)} color={C.marigold} op={0.4} seed={seed} f="wcM" draw={draw} />
    {/* small notices with crosses */}
    {[
      [-215, -300, 120, 120],
      [-215, -160, 120, 140],
      [100, -300, 120, 150],
      [100, -130, 120, 110],
    ].map(([nx, ny, nw, nh], i) => (
      <g key={i} transform={`rotate(${hn(i + 3) * 4} ${nx + nw / 2} ${ny})`}>
        <Fill d={rectD(nx, ny, nw, nh)} color={C.cream} op={0.7} seed={seed + 10 + i} f="wcS" draw={draw} o={{strokeWidth: 1.8}} />
        <RS shapes={[L(nx + 14, ny + 26, nx + nw - 20, ny + 26), L(nx + 14, ny + 46, nx + nw - 34, ny + 46), L(nx + 14, ny + 66, nx + nw - 26, ny + 66)]} seed={seed + 20 + i * 3} o={THIN} draw={draw} opacity={0.6} />
        <RS shapes={[L(nx + 20, ny + nh - 44, nx + 56, ny + nh - 10), L(nx + 56, ny + nh - 44, nx + 20, ny + nh - 10)]} seed={seed + 40 + i} o={{...THIN, stroke: C.crimson, strokeWidth: 3}} draw={stamp} opacity={1 - ok * 0.8} />
        {ok > 0 ? <R s={P(`M ${nx + 60} ${ny + nh - 30} L ${nx + 76} ${ny + nh - 12} L ${nx + 106} ${ny + nh - 52}`)} seed={seed + 70 + i} o={{...THIN, stroke: C.pine, strokeWidth: 5}} draw={clamp01(ok * 1.6 - i * 0.15)} /> : null}
        <circle cx={nx + nw / 2} cy={ny + 6} r={5} fill={C.crimson} />
      </g>
    ))}
    {/* big notice */}
    <g transform="rotate(-2 0 -150)">
      <Fill d={rectD(-80, -300, 160, 280)} color={C.cream} op={0.85} seed={seed + 60} f="wcS" draw={draw} knock={C.cream} />
      <circle cx={0} cy={-292} r={6} fill={C.pine} />
      <RS shapes={[L(-56, -262, 50, -262), L(-56, -240, 30, -240), L(-56, -218, 44, -218)]} seed={seed + 61} o={THIN} draw={draw} opacity={0.5} />
      <HText x={0} y={-150} size={30} anchor="middle" color={C.crimson} reveal={stamp} widthFactor={0.48}>
        Experience
      </HText>
      <HText x={0} y={-112} size={30} anchor="middle" color={C.crimson} reveal={stamp} widthFactor={0.48}>
        required
      </HText>
      {stamp > 0 ? <R s={P(rectD(-66, -186, 132, 90, 10))} seed={seed + 62} o={{...THIN, stroke: C.crimson, strokeWidth: 3}} draw={stamp} /> : null}
      {ok > 0 ? <R s={P('M -70 -60 L -20 -10 L 80 -130')} seed={seed + 63} o={{...THIN, stroke: C.pine, strokeWidth: 12}} draw={ok} /> : null}
    </g>
  </g>
);

/** Shop door with a hanging sign. */
export const ShopDoor: React.FC<{x: number; y: number; s?: number; seed?: number; draw?: number; sign?: number}> = ({x, y, s = 1, seed = 2200, draw = 1, sign = 1}) => {
  const f = useCurrentFrame();
  const sw = Math.sin(f / 16) * 2.5 * sign;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Fill d={rectD(-260, -620, 520, 620)} color={C.crimson} op={0.32} seed={seed} f="wcL" draw={draw} />
      {/* brick hint */}
      <RS shapes={Array.from({length: 8}).map((_, i) => L(-250, -580 + i * 70, -180, -580 + i * 70))} seed={seed + 1} o={THIN} draw={draw} opacity={0.45} />
      <RS shapes={Array.from({length: 8}).map((_, i) => L(180, -560 + i * 70, 250, -560 + i * 70))} seed={seed + 2} o={THIN} draw={draw} opacity={0.45} />
      <Fill d={rectD(-150, -520, 300, 520)} color={C.pine} op={0.75} seed={seed + 3} f="wcM" draw={draw} />
      <Fill d={rectD(-120, -490, 240, 200)} color={C.pineTint} op={0.35} seed={seed + 4} f="wcS" draw={draw} />
      <Hatch x={-110} y={-480} w={90} h={180} seed={seed + 5} draw={draw} op={0.3} />
      <R s={El(110, -260, 18, 18)} seed={seed + 6} o={OUT} draw={draw} />
      {sign > 0 ? (
        <g transform={`rotate(${sw} 0 -470)`} opacity={Math.min(1, sign * 2)}>
          <R s={Ln([-60, -470], [0, -500], [60, -470])} seed={seed + 7} o={THIN} />
          <Fill d={rectD(-130, -470, 260, 120, 8)} color={C.cream} op={0.85} seed={seed + 8} f="wcS" knock={C.cream} />
          <HText x={0} y={-422} size={34} anchor="middle" color={C.crimson} reveal={sign} widthFactor={0.48}>
            Experience
          </HText>
          <HText x={0} y={-382} size={34} anchor="middle" color={C.crimson} reveal={sign} widthFactor={0.48}>
            required
          </HText>
        </g>
      ) : null}
    </g>
  );
};

/** Week calendar that overflows. p 0..1 fills; overflow > 0 lets blocks spill. */
export const Calendar: React.FC<{x: number; y: number; s?: number; p: number; seed?: number}> = ({x, y, s = 1, p, seed = 2300}) => {
  const cols = 5;
  const rows = 6;
  const cw = 70;
  const rh = 46;
  const blocks: {c: number; r: number; h: number; col: string}[] = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if ((c * 7 + r * 3) % 5 !== 4) blocks.push({c, r, h: 1, col: [C.pine, C.crimson, C.marigold][(c + r) % 3]});
  const extra = 9;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Fill d={rectD(-10, -60, cols * cw + 20, rows * rh + 80, 10)} color={C.cream} op={0.6} seed={seed} f="wcS" knock={C.cream} />
      <Fill d={rectD(-10, -60, cols * cw + 20, 46, 10)} color={C.crimson} op={0.75} seed={seed + 1} f="wcS" />
      <RS shapes={Array.from({length: cols - 1}).map((_, i) => L((i + 1) * cw, -10, (i + 1) * cw, rows * rh + 10))} seed={seed + 2} o={{...THIN, strokeWidth: 1}} opacity={0.5} />
      {blocks.map((b, i) => {
        const t = clamp01(p * blocks.length * 1.1 - i);
        if (t <= 0) return null;
        return (
          <g key={i} opacity={t}>
            <Wash d={rectD(b.c * cw + 6, b.r * rh + 4 - (1 - t) * 20, cw - 12, rh - 8, 5)} color={b.col} op={0.7} f="wcS" />
            <R s={P(rectD(b.c * cw + 6, b.r * rh + 4 - (1 - t) * 20, cw - 12, rh - 8, 5))} seed={seed + 10 + i} o={{...THIN, strokeWidth: 1.2}} />
          </g>
        );
      })}
      {Array.from({length: extra}).map((_, i) => {
        const t = clamp01(p * 3 - 2 - i * 0.08);
        if (t <= 0) return null;
        const bx = 20 + ((i * 97) % (cols * cw - 60));
        const by = -80 - i * 26 - t * 30;
        return (
          <g key={`x${i}`} transform={`rotate(${hn(i) * 18} ${bx} ${by})`} opacity={Math.min(1, t * 2)}>
            <Wash d={rectD(bx, by, cw - 12, rh - 8, 5)} color={[C.crimson, C.marigold, C.pine][i % 3]} op={0.75} f="wcS" />
            <R s={P(rectD(bx, by, cw - 12, rh - 8, 5))} seed={seed + 80 + i} o={{...THIN, strokeWidth: 1.4}} />
          </g>
        );
      })}
    </g>
  );
};

/** Street-level Kathmandu row of houses. */
export const KtmStreet: React.FC<{x: number; y: number; seed?: number; draw?: number}> = ({x, y, seed = 2400, draw = 1}) => (
  <g>
    {[0, 1, 2, 3, 4].map((i) => (
      <g key={i}>
        <Fill d={rectD(x + i * 170, y - 240 - (i % 2) * 60, 160, 240 + (i % 2) * 60)} color={i % 2 ? C.crimson : C.marigoldTint} op={i % 2 ? 0.35 : 0.5} seed={seed + i * 5} f="wcM" draw={st(draw, i, 5)} />
        <RS shapes={[Rc(x + i * 170 + 24, y - 200 - (i % 2) * 60, 40, 50), Rc(x + i * 170 + 96, y - 200 - (i % 2) * 60, 40, 50)]} seed={seed + i * 5 + 1} o={THIN} draw={st(draw, i, 5)} />
        <Fill d={`M ${x + i * 170 - 14} ${y - 240 - (i % 2) * 60} L ${x + i * 170 + 174} ${y - 240 - (i % 2) * 60} L ${x + i * 170 + 150} ${y - 270 - (i % 2) * 60} L ${x + i * 170 + 10} ${y - 270 - (i % 2) * 60} Z`} color={C.ink} op={0.45} seed={seed + i * 5 + 2} f="wcS" draw={st(draw, i, 5)} />
      </g>
    ))}
    <R s={P(`M ${x - 40} ${y - 320} Q ${x + 400} ${y - 260} ${x + 880} ${y - 330}`)} seed={seed + 60} o={THIN} draw={draw} />
    <R s={P(`M ${x - 40} ${y - 300} Q ${x + 400} ${y - 236} ${x + 880} ${y - 310}`)} seed={seed + 61} o={THIN} draw={draw} />
  </g>
);

/** Ground: a flat band of colour that fades downward (no hard boxes on the light sets). */
export const Ground: React.FC<{x1: number; x2: number; y: number; seed: number; draw?: number; color?: string}> = ({x1, x2, y, seed, draw = 1, color: col = C.marigoldTint}) => {
  const color = col === C.crimsonTint ? C.crimsonSoft : col;
  const id = React.useId().replace(/:/g, '');
  return (
    <g>
      <defs>
        <linearGradient id={`gf${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.85} />
          <stop offset="0.55" stopColor={color} stopOpacity={0.35} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`gx${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset={Math.min(0.45, 180 / (x2 - x1))} stopColor="#fff" stopOpacity={1} />
          <stop offset={1 - Math.min(0.45, 180 / (x2 - x1))} stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id={`gm${id}`} maskUnits="userSpaceOnUse" x={x1} y={y - 10} width={x2 - x1} height={440}>
          <rect x={x1} y={y - 10} width={x2 - x1} height={440} fill={`url(#gx${id})`} />
        </mask>
      </defs>
      <rect x={x1} y={y} width={x2 - x1} height={420} fill={`url(#gf${id})`} opacity={draw} mask={`url(#gm${id})`} />
      <g mask={`url(#gm${id})`}>
        <R s={L(x1, y, x2, y)} seed={seed} o={OUT} draw={draw} />
      </g>
    </g>
  );
};

export type {Shape};
export {El, Ln};
