import React from 'react';
import {useCurrentFrame} from 'remotion';
import {getLength, getPointAtLength} from '@remotion/paths';
import {Character, EXPR, ExprName, POSE, Who, mixExpr} from '../../characters/Character';
import {HText, Wash, Bloom, rectD} from '../../lib/paint';
import {E, clamp01, ramp} from '../../lib/anim';
import {C} from '../../lib/theme';
import {Coin, Fill, Phone, Thread} from '../../props/kit';
import {CafeFront, Ground, Mountains, Sea, Skyline, Stupa} from '../../props/sets';

/* One sheet, four places: Melbourne (left) — sea — Pokhara — Kathmandu (right). */
export const NODES = {
  emma: {x: 190, y: 930},
  rajan: {x: 410, y: 940},
  sita: {x: 1250, y: 930},
  bikash: {x: 1690, y: 935},
};
export const THREAD_MAIN = 'M 432 802 C 520 380 1080 300 1226 796 C 1340 610 1560 610 1668 800';
export const THREAD_EMMA = 'M 214 800 C 250 700 380 700 432 802';
export const LEN_MAIN = getLength(THREAD_MAIN);
export const LEN_EMMA = getLength(THREAD_EMMA);
export const at = (d: string, len: number, t: number) => getPointAtLength(d, len * clamp01(t));
/** fraction along THREAD_MAIN where Sita's knot sits */
export const SITA_T = (() => {
  // the first C segment ends at Sita; measure it
  return getLength('M 432 802 C 520 380 1080 300 1226 796') / LEN_MAIN;
})();

export const Knot: React.FC<{x: number; y: number; t: number}> = ({x, y, t}) => {
  if (t <= 0) return null;
  const s = E.back(clamp01(t));
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(45)`}>
      <rect x={-13} y={-13} width={26} height={26} fill="url(#dhakaS)" stroke={C.ink} strokeWidth={2.4} />
    </g>
  );
};

export const MapBackdrop: React.FC<{labels?: number}> = ({labels = 1}) => (
  <g>
    <Bloom cx={960} cy={300} rx={1100} ry={260} color={C.marigoldTint} op={0.3} />
    <Skyline x={20} y={760} s={0.4} far />
    <CafeFront x={250} y={760} s={0.3} />
    <Ground x1={-200} x2={600} y={760} seed={300} />
    <Sea x={600} y={760} w={520} seed={301} />
    <g opacity={0.9}>
      <Mountains x={1050} y={760} s={0.36} />
    </g>
    <Stupa x={1760} y={760} s={0.27} />
    <Ground x1={1120} x2={2100} y={760} seed={302} color={C.sage} />
    {labels > 0 ? (
      <g opacity={labels}>
        <HText x={300} y={1050} size={36} anchor="middle" color={C.inkSoft}>Melbourne</HText>
        <HText x={1250} y={1050} size={36} anchor="middle" color={C.inkSoft}>Pokhara</HText>
        <HText x={1690} y={1050} size={36} anchor="middle" color={C.inkSoft}>Kathmandu</HText>
      </g>
    ) : null}
  </g>
);

export const Cast: React.FC<{exprs?: Partial<Record<Who, ExprName | ReturnType<typeof mixExpr>>>; rajanPose?: keyof typeof POSE; scale?: number}> = ({exprs = {}, rajanPose = 'phone', scale = 0.66}) => (
  <g>
    <Character who="emma" x={NODES.emma.x} y={NODES.emma.y} scale={scale} expr={exprs.emma ?? 'content'} />
    <Character who="rajan" x={NODES.rajan.x} y={NODES.rajan.y} scale={scale * 1.0} expr={exprs.rajan ?? 'happy'} pose={rajanPose} frontProp={rajanPose === 'phone' ? <Phone x={6} y={-6} s={0.55} seed={310} /> : undefined} />
    <Character who="sita" x={NODES.sita.x} y={NODES.sita.y} scale={scale} facing={-1} expr={exprs.sita ?? 'neutral'} />
    <Character who="bikash" x={NODES.bikash.x} y={NODES.bikash.y} scale={scale} facing={-1} expr={exprs.bikash ?? 'neutral'} />
  </g>
);

/** The thread drawn to progress p (0..1) plus the Emma branch at q. */
export const MapThread: React.FC<{p: number; q: number}> = ({p, q}) => (
  <g>
    <Thread d={THREAD_EMMA} p={q} seed={320} w={14} />
    <Thread d={THREAD_MAIN} p={p} seed={321} />
    <Knot x={432} y={802} t={ramp(p, 0, 0.05) * 1.01} />
    <Knot x={214} y={800} t={q > 0.98 ? 1 : 0} />
    <Knot x={1226} y={796} t={p >= SITA_T ? 1 : 0} />
    <Knot x={1668} y={800} t={p > 0.99 ? 1 : 0} />
  </g>
);

export const RoleTag: React.FC<{x: number; y: number; t: number; children: string; color: string; seed: number}> = ({x, y, t, children, color, seed}) => {
  if (t <= 0) return null;
  const w = children.length * 22 + 50;
  return (
    <g transform={`translate(${x} ${y}) scale(${E.back(clamp01(t))})`}>
      <Fill d={rectD(-w / 2, -30, w, 56, 26)} color={color} op={0.85} seed={seed} f="wcS" knock={C.cream} />
      <HText x={0} y={12} size={36} anchor="middle" color={C.cream}>
        {children}
      </HText>
    </g>
  );
};

export const MovingCoin: React.FC<{d: string; len: number; t: number; seed: number; s?: number}> = ({d, len, t, seed, s = 0.9}) => {
  const f = useCurrentFrame();
  if (t <= 0 || t >= 1) return null;
  const p = at(d, len, t);
  if (!p) return null;
  return <Coin x={p.x} y={p.y - 30} s={s} seed={seed} spin={f / 4} />;
};

export {Wash};
