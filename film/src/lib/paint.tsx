import React, {createContext, useContext, useId} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame} from 'remotion';
import {BoilCtx, DrawCtx, useBoil} from './rough';
import {C, DEVA, HAND, T} from './theme';
import {hn} from './anim';

/* ------------------------------------------------------------------ */
/* Shared SVG defs: watercolour filters + Dhaka weave pattern          */
/* ------------------------------------------------------------------ */

const WcFilter: React.FC<{id: string; warp: number; freq: number; seed: number; rim: number; blur: number}> = ({
  id,
  warp,
  freq,
  seed,
  rim,
  blur,
}) => (
  <filter id={id} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
    {/* wobbly, soaked edge */}
    <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={3} seed={seed} result="warp" />
    <feDisplacementMap in="SourceGraphic" in2="warp" scale={warp} xChannelSelector="R" yChannelSelector="G" result="shape" />
    <feGaussianBlur in="shape" stdDeviation={blur} result="soft" />
    {/* pigment mottling */}
    <feTurbulence type="fractalNoise" baseFrequency={freq * 2.6} numOctaves={2} seed={seed + 7} result="pig" />
    <feColorMatrix in="pig" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.5 -0.35" result="pigA" />
    <feComposite in="soft" in2="pigA" operator="arithmetic" k1={0.22} k2={0.82} k3={0} k4={0} result="mottled" />
    {/* edge darkening where the pigment pooled as it dried */}
    <feMorphology in="shape" operator="erode" radius={rim} result="inner" />
    <feGaussianBlur in="inner" stdDeviation={rim * 1.1} result="innerB" />
    <feComposite in="soft" in2="innerB" operator="out" result="rimA" />
    <feComponentTransfer in="rimA" result="rimB">
      <feFuncA type="linear" slope={0.75} />
    </feComponentTransfer>
    <feMerge>
      <feMergeNode in="mottled" />
      <feMergeNode in="rimB" />
    </feMerge>
  </filter>
);

export const Defs: React.FC = () => (
  <defs>
    <WcFilter id="wcS" warp={6} freq={0.05} seed={3} rim={1.6} blur={0.6} />
    <WcFilter id="wcM" warp={12} freq={0.03} seed={11} rim={2.6} blur={0.9} />
    <WcFilter id="wcL" warp={26} freq={0.012} seed={23} rim={4} blur={1.6} />
    {[0, 1, 2].map((i) => (
      <filter key={i} id={`inkW${i}`} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={40 + i * 13} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    ))}
    <filter id="soften" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
    <pattern id="dhaka" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
      <rect width="26" height="26" fill={C.crimson} />
      <path d="M13 1 L25 13 L13 25 L1 13 Z" fill={C.marigold} />
      <path d="M13 6 L20 13 L13 20 L6 13 Z" fill={C.pine} />
      <path d="M13 10 L16 13 L13 16 L10 13 Z" fill={C.cream} />
      <path d="M0 0 L4 0 L0 4 Z M26 0 L22 0 L26 4 Z M0 26 L4 26 L0 22 Z M26 26 L22 26 L26 22 Z" fill={C.ink} />
    </pattern>
    <pattern id="dhakaS" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(4)">
      <rect width="12" height="12" fill={C.crimson} />
      <path d="M6 0.5 L11.5 6 L6 11.5 L0.5 6 Z" fill={C.marigold} />
      <path d="M6 3 L9 6 L6 9 L3 6 Z" fill={C.pine} />
      <circle cx="6" cy="6" r="1" fill={C.cream} />
    </pattern>
  </defs>
);

/* ------------------------------------------------------------------ */
/* Watercolour wash                                                    */
/* ------------------------------------------------------------------ */

export const Wash: React.FC<{
  d: string;
  color: string;
  op?: number;
  f?: 'wcS' | 'wcM' | 'wcL';
  reveal?: number;
  dx?: number;
  dy?: number;
}> = ({d, color, op = 0.75, f = 'wcM', reveal = 1, dx = 0, dy = 0}) => {
  const dctx = React.useContext(DrawCtx);
  const bg = useContext(BgCtx);
  // full-bleed tints were the old "paper"; on the new light sets they become flat, quiet colour
  if (bg !== 'paper' && (d.startsWith('M-100 -100') || d.startsWith('M-200 -200'))) {
    return <path d={d} fill={color} opacity={op * 0.35} />;
  }
  reveal = Math.min(reveal, Math.max(0, (dctx - 0.55) / 0.45));
  if (reveal <= 0.001) return null;
  return (
    <path
      d={d}
      fill={color}
      opacity={op * Math.min(1, reveal * 1.3)}
      filter={`url(#${f})`}
      transform={dx || dy ? `translate(${dx} ${dy})` : undefined}
      style={{mixBlendMode: 'multiply'}}
    />
  );
};

/** Soft blurred bloom of colour, for skies, glows and pooled pigment. */
export const Bloom: React.FC<{cx: number; cy: number; rx: number; ry: number; color: string; op?: number}> = ({
  cx,
  cy,
  rx,
  ry,
  color,
  op = 0.5,
}) => {
  const bg = useContext(BgCtx);
  // on the light sets, multiplied blooms go muddy: keep them as a faint screen of colour
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} opacity={bg === 'paper' ? op : op * 0.45} filter="url(#soften)" style={{mixBlendMode: bg === 'paper' ? 'multiply' : 'normal'}} />;
};

/* path helpers */
export const ellD = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;
export const rectD = (x: number, y: number, w: number, h: number, r = 0) =>
  r
    ? `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`
    : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;

/* ------------------------------------------------------------------ */
/* Handwritten text                                                    */
/* ------------------------------------------------------------------ */

export const HText: React.FC<{
  x: number;
  y: number;
  size?: number;
  children: string;
  reveal?: number;
  anchor?: 'start' | 'middle' | 'end';
  color?: string;
  weight?: number;
  rot?: number;
  font?: string;
  widthFactor?: number;
}> = ({x, y, size = 48, children, reveal = 1, anchor = 'start', color = C.ink, weight = 700, rot = 0, font, widthFactor = 0.55}) => {
  const id = useId().replace(/:/g, '');
  const b = useBoil();
  if (reveal <= 0.001) return null;
  // generous reveal box: it must never be narrower than the real glyphs (stars and capitals are wide)
  const w = children.length * size * Math.max(widthFactor, 0.72) + size * 2;
  const x0 = anchor === 'start' ? x - size * 0.3 : anchor === 'middle' ? x - w / 2 : x - w;
  const jr = hn(b * 3.1 + x) * 0.35;
  const jx = hn(b * 7.7 + y) * 0.7;
  return (
    <g transform={`translate(${jx} 0) rotate(${rot + jr} ${x} ${y})`}>
      <clipPath id={`c${id}`}>
        <rect x={x0} y={y - size * 1.4} width={w * reveal} height={size * 2.2} />
      </clipPath>
      <text
        x={x}
        y={y}
        fontFamily={font ?? (/[\u0900-\u097F]/.test(children) ? DEVA : HAND)}
        fontSize={size}
        fontWeight={weight}
        fill={color}
        textAnchor={anchor}
        clipPath={reveal < 1 ? `url(#c${id})` : undefined}
      >
        {children}
      </text>
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Shot: paper + camera                                                */
/* ------------------------------------------------------------------ */

export type Cam = {x: number; y: number; z: number; r?: number};

export const Paper: React.FC<{cam?: Cam; tint?: string}> = ({tint = C.paper}) => <AbsoluteFill style={{backgroundColor: tint}} />;

export const GrainOver: React.FC<{cam?: Cam}> = ({cam = {x: 960, y: 540, z: 1}}) => {
  const tile = 900 * cam.z;
  const ox = (960 - cam.x * cam.z) % tile;
  const oy = (540 - cam.y * cam.z) % tile;
  return (
    <>
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('paper-grain.png')})`,
          backgroundSize: `${tile}px ${tile}px`,
          backgroundPosition: `${ox}px ${oy}px`,
          mixBlendMode: 'multiply',
          opacity: 0.85,
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 58%, rgba(120,80,40,0.16) 100%)',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Light backgrounds ("sets")                                         */
/* ------------------------------------------------------------------ */

/**
 * paper  — the old lokta paper + grain (kept for comparison)
 * fields — flat warm off-white with large soft colour fields that drift, like light through fabric
 * weave  — a very faint Dhaka-weave lattice as the set (woven texture, not paper)
 * cut    — layered cut-paper planes in theme tints with soft shadows (diorama depth)
 * wash   — clean off-white with p5.brush watercolour blooms behind the action
 * fieldsWeave — fields + the weave as a quiet accent (the film's choice)
 */
export type BgMode = 'paper' | 'fields' | 'weave' | 'cut' | 'wash' | 'fieldsWeave';
export const BgCtx = createContext<BgMode>('fieldsWeave');

const FIELDS: [string, number, number, number, number][] = [
  // colour, x, y, rx, ry
  [T.honeyWash, 380, 260, 760, 520],
  [T.brickSoft, 1560, 220, 640, 460],
  [T.sageSoft, 1300, 900, 820, 460],
  [T.pineSoft, 200, 980, 620, 380],
  [T.honeyWash, 980, 560, 520, 340],
];

const Fields: React.FC<{cam: Cam; f: number; strength?: number}> = ({cam, f, strength = 1}) => (
  <>
    {FIELDS.map(([col, x, y, rx, ry], i) => {
      const px = x - (cam.x - 960) * 0.25 + Math.sin(f / 170 + i * 1.7) * 70;
      const py = y - (cam.y - 540) * 0.25 + Math.cos(f / 210 + i * 1.3) * 45;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: px - rx,
            top: py - ry,
            width: rx * 2,
            height: ry * 2,
            background: `radial-gradient(closest-side, ${col} 0%, ${col}cc 35%, ${col}00 100%)`,
            opacity: (i === 3 ? 0.55 : 0.85) * strength,
          }}
        />
      );
    })}
  </>
);

const Weave: React.FC<{cam: Cam; op: number}> = ({cam, op}) => {
  const s = 46 * cam.z;
  const ox = (960 - cam.x * cam.z) % s;
  const oy = (540 - cam.y * cam.z) % s;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: op}}>
      <defs>
        <pattern id="weaveSet" width={s} height={s} patternUnits="userSpaceOnUse" x={ox} y={oy}>
          <path d={`M ${s / 2} 0 L ${s} ${s / 2} L ${s / 2} ${s} L 0 ${s / 2} Z`} fill="none" stroke={T.brick} strokeWidth={s * 0.09} />
          <path d={`M ${s / 2} ${s * 0.25} L ${s * 0.75} ${s / 2} L ${s / 2} ${s * 0.75} L ${s * 0.25} ${s / 2} Z`} fill={T.honey} />
          <path d={`M ${s / 2} ${s * 0.4} L ${s * 0.6} ${s / 2} L ${s / 2} ${s * 0.6} L ${s * 0.4} ${s / 2} Z`} fill={T.pine} />
        </pattern>
      </defs>
      <rect width={1920} height={1080} fill="url(#weaveSet)" />
    </svg>
  );
};

const CutPaper: React.FC<{cam: Cam}> = ({cam}) => {
  const layers: [string, number, number, number][] = [
    // colour, base y, amplitude, parallax
    [T.honeyWash, 300, 60, 0.15],
    [T.sageSoft, 760, 50, 0.3],
    [T.pineSoft, 900, 40, 0.45],
    [T.brickSoft, 1010, 30, 0.6],
  ];
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <defs>
        <filter id="cutShadow" x="-10%" y="-20%" width="120%" height="140%">
          <feDropShadow dx="0" dy="-6" stdDeviation="9" floodColor={T.ink} floodOpacity="0.12" />
        </filter>
      </defs>
      {layers.map(([col, by, amp, par], i) => {
        const ox = -((cam.x - 960) * par) % 1200;
        let d = `M ${-400 + ox} 1200 L ${-400 + ox} ${by}`;
        for (let x = -400; x <= 2400; x += 200) d += ` Q ${x + 100 + ox} ${by + (i % 2 ? amp : -amp) * (x % 400 === 0 ? 1 : -1)} ${x + 200 + ox} ${by}`;
        d += ` L ${2600 + ox} 1200 Z`;
        if (i === 0) d = `M 0 0 L 1920 0 L 1920 ${by - 120} C 1400 ${by + 40} 700 ${by - 160} 0 ${by} Z`;
        return <path key={i} d={d} fill={col} filter="url(#cutShadow)" />;
      })}
    </svg>
  );
};

const WASH_SPOTS: [string, number, number, number][] = [
  ['bloom-honey', 420, 640, 1.1],
  ['bloom-sage', 1400, 660, 1.05],
  ['bloom-brick', 1650, 300, 0.7],
];

const Washes: React.FC<{cam: Cam}> = ({cam}) => (
  <>
    {WASH_SPOTS.map(([name, x, y, sc], i) => {
      const px = 960 + (x - cam.x) * cam.z;
      const py = 540 + (y - cam.y) * cam.z;
      const w = 1200 * sc * cam.z;
      const h = 800 * sc * cam.z;
      return <img key={i} src={staticFile(`brush/${name}.png`)} style={{position: 'absolute', left: px - w / 2, top: py - h / 2, width: w, height: h}} />;
    })}
  </>
);

export const Backdrop: React.FC<{cam: Cam; tint?: string}> = ({cam, tint}) => {
  const mode = useContext(BgCtx);
  const f = useCurrentFrame();
  if (mode === 'paper') return <Paper cam={cam} tint={tint} />;
  return (
    <AbsoluteFill style={{backgroundColor: mode === 'cut' ? T.paper : T.white, overflow: 'hidden'}}>
      {mode === 'fields' || mode === 'fieldsWeave' ? <Fields cam={cam} f={f} /> : null}
      {mode === 'weave' ? <Weave cam={cam} op={0.045} /> : null}
      {mode === 'fieldsWeave' ? <Weave cam={cam} op={0.03} /> : null}
      {mode === 'cut' ? <CutPaper cam={cam} /> : null}
      {mode === 'wash' ? <Washes cam={cam} /> : null}
    </AbsoluteFill>
  );
};

export const Shot: React.FC<{cam?: Cam; children: React.ReactNode; tint?: string; overlay?: React.ReactNode}> = ({
  cam = {x: 960, y: 540, z: 1},
  children,
  tint,
  overlay,
}) => {
  const f = useCurrentFrame();
  const boil = Math.floor(f / 4) % 3;
  const bgMode = useContext(BgCtx);
  return (
    <BoilCtx.Provider value={boil}>
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Backdrop cam={cam} tint={tint} />
        <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <Defs />
          <g transform={`translate(960 540) rotate(${cam.r ?? 0}) scale(${cam.z}) translate(${-cam.x} ${-cam.y})`}>{children}</g>
          {overlay}
        </svg>
        {bgMode === 'paper' ? <GrainOver cam={cam} /> : null}
      </AbsoluteFill>
    </BoilCtx.Provider>
  );
};
