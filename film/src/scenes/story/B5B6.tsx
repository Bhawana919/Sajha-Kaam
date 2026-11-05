import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {Character, ExprName, HEIGHTS, Who} from '../../characters/Character';
import {HText, Shot, Wash, Bloom, rectD, ellD} from '../../lib/paint';
import {E, kf, ramp, clamp01, hn, lerp} from '../../lib/anim';
import {C, DISPLAY, SKIN} from '../../lib/theme';
import {L, P, R, Rc} from '../../lib/rough';
import {AppMark, Coin, DhakaSwatch, Fill, SitePage, Stars, THIN, OUT} from '../../props/kit';
import {CheckBox, Jar} from './B3B4';
import {ZCoin, flowParticle} from '../../lib/tools';

/** Circular portrait: the same model-sheet character, cropped to the head. */
export const Avatar: React.FC<{who: Who; x: number; y: number; r: number; expr?: ExprName; ring?: string; seed?: number}> = ({who, x, y, r, expr = 'content', ring = C.ink, seed = 1}) => {
  const id = useId().replace(/:/g, '');
  const s = (r * 2) / 120;
  return (
    <g>
      <clipPath id={`av${id}`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} fill={C.cream} />
      <Wash d={ellD(x, y, r, r)} color={C.marigoldTint} op={0.5} f="wcS" />
      <g clipPath={`url(#av${id})`}>
        <Character who={who} x={x + 2 * s} y={y + (316 * HEIGHTS[who] + 6) * s} scale={s} expr={expr} shadow={false} pose={{fa: [0, 0], ba: [0, 0], lean: 0, head: 0, legs: 'hidden', walk: 0, squash: 0, lift: 0}} />
      </g>
      <R s={{t: 'ellipse', x, y, w: r * 2, h: r * 2}} seed={seed} o={{...THIN, stroke: ring, strokeWidth: 3}} />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* B5 — Job room                                                      */
/* ------------------------------------------------------------------ */

const Msg: React.FC<{x: number; y: number; who: Who; t: number; w: number; children?: React.ReactNode; color?: string; seed: number; right?: boolean}> = ({x, y, who, t, w, children, color = C.cream, seed, right}) => {
  if (t <= 0) return null;
  const s = E.back(clamp01(t));
  const bx = right ? x - w - 70 : x + 70;
  return (
    <g opacity={Math.min(1, t * 2)} transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>
      <Avatar who={who} x={x} y={y} r={34} seed={seed} />
      <Fill d={rectD(bx, y - 38, w, 76, 22)} color={color} op={0.7} seed={seed + 1} f="wcS" knock={C.cream} />
      {children}
    </g>
  );
};

const Stamp: React.FC<{x: number; y: number; t: number; text: string; seed: number; size?: number; rot?: number}> = ({x, y, t, text, seed, size = 90, rot = -8}) => {
  if (t <= 0) return null;
  const sc = kf(t, [[0, 2.2], [0.35, 0.92, E.in], [0.5, 1.04], [0.7, 1]]);
  const w = text.length * size * 0.52 + 70;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc})`} opacity={Math.min(1, t * 3)}>
      <R s={P(rectD(-w / 2, -size * 0.75, w, size * 1.3, 16))} seed={seed} o={{...THIN, stroke: C.crimson, strokeWidth: 7}} />
      <R s={P(rectD(-w / 2 + 12, -size * 0.75 + 12, w - 24, size * 1.3 - 24, 10))} seed={seed + 1} o={{...THIN, stroke: C.crimson, strokeWidth: 3}} />
      <HText x={0} y={size * 0.28} size={size} anchor="middle" color={C.crimson} weight={700}>
        {text}
      </HText>
    </g>
  );
};
export {Stamp};

export const S5_1: React.FC = () => {
  const f = useCurrentFrame();
  const cam = {x: kf(f, [[0, 760], [150, 980], [240, 1180], [300, 960]]), y: kf(f, [[0, 520], [240, 520], [300, 540]]), z: kf(f, [[0, 1.18], [240, 1.18], [300, 1.0]])};
  const tick = [ramp(f, 30, 40), ramp(f, 60, 70), f < 170 ? ramp(f, 100, 110) : 1 - ramp(f, 170, 176) + ramp(f, 262, 272), ramp(f, 290, 300)];
  const up1 = ramp(f, 50, 120, E.soft);
  const up2 = ramp(f, 80, 150, E.soft);
  const v2 = ramp(f, 244, 270);
  return (
    <Shot cam={cam}>
      <Wash d={rectD(-200, -200, 2400, 1500)} color={C.marigoldTint} op={0.22} f="wcL" />
      {/* the room: a big hand-drawn board */}
      <Fill d={rectD(150, 80, 1620, 880, 26)} color={C.inkSoft} op={0.35} seed={700} f="wcM" />
      <path d={rectD(176, 140, 1568, 796, 12)} fill={C.cream} />
      <DhakaSwatch x={176} y={108} w={1568} h={24} seed={701} />
      <AppMark x={220} y={182} s={0.9} seed={702} />
      {/* columns */}
      <R s={L(640, 170, 640, 910)} seed={703} o={THIN} opacity={0.5} />
      <R s={L(1260, 170, 1260, 910)} seed={704} o={THIN} opacity={0.5} />
      {/* column icons instead of words */}
      <CheckBox x={420} y={190} t={1} seed={705} />
      <g transform="translate(950 190)">
        <Fill d="M -30 -20 L 30 -20 L 30 14 L -6 14 L -18 26 L -16 14 L -30 14 Z" color={C.marigold} op={0.7} seed={706} f="wcS" o={{strokeWidth: 2}} />
      </g>
      <g transform="translate(1500 190)">
        <R s={P('M -8 18 L -8 -14 C -8 -26 12 -26 12 -14 L 12 14 C 12 22 2 22 2 14 L 2 -8')} seed={707} o={{...THIN, strokeWidth: 3.5}} />
      </g>
      {/* tasks */}
      {tick.map((t, i) => (
        <g key={i}>
          <CheckBox x={240} y={300 + i * 140} s={1.3} t={t} seed={710 + i * 3} />
          <R s={L(290, 290 + i * 140, 580 - (i % 2) * 70, 290 + i * 140)} seed={725 + i} o={{...THIN, strokeWidth: 5}} opacity={t > 0.9 ? 0.35 : 0.8} />
          <R s={L(290, 318 + i * 140, 500 - (i % 3) * 40, 318 + i * 140)} seed={730 + i} o={THIN} opacity={0.4} />
        </g>
      ))}
      {/* messages */}
      <Msg x={710} y={300} who="sita" t={ramp(f, 24, 34)} w={420} seed={740}>
        <R s={L(800, 290, 1100, 290)} seed={742} o={{...THIN, strokeWidth: 4}} opacity={0.6} />
        <R s={L(800, 312, 1020, 312)} seed={743} o={THIN} opacity={0.5} />
      </Msg>
      <Msg x={710} y={430} who="bikash" t={ramp(f, 76, 86)} w={360} seed={745}>
        <R s={L(800, 422, 1040, 422)} seed={747} o={{...THIN, strokeWidth: 4}} opacity={0.6} />
      </Msg>
      <Msg x={1190} y={580} who="rajan" t={ramp(f, 156, 166)} w={440} seed={750} right color={C.crimsonTint}>
        {/* one change: a pencil circling a detail of the page */}
        <g transform="translate(760 560)" opacity={ramp(f, 162, 176)}>
          <g transform="scale(0.55)">
            <SitePage seed={752} p={1} />
          </g>
          <R s={{t: 'ellipse', x: 30, y: 30, w: 80, h: 56}} seed={753} o={{...THIN, stroke: C.crimson, strokeWidth: 4}} draw={ramp(f, 168, 186)} />
          <g transform={`translate(${170 + Math.sin(f / 4) * 6} 10) rotate(35)`}>
            <path d="M -6 -40 L 6 -40 L 6 24 L 0 36 L -6 24 Z" fill={C.marigold} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
          </g>
        </g>
      </Msg>
      <Msg x={710} y={730} who="sita" t={ramp(f, 240, 250)} w={260} seed={755}>
        <R s={P('M 870 730 L 896 756 L 950 704')} seed={756} o={{...THIN, stroke: C.pine, strokeWidth: 7}} draw={ramp(f, 248, 262)} />
      </Msg>
      {/* files */}
      <g opacity={ramp(f, 46, 56)}>
        <Fill d={rectD(1310, 260, 400, 250, 10)} color={C.cream} op={0.5} seed={760} f="wcS" />
        <g transform="translate(1330 280) scale(1.8)">
          <SitePage seed={761} p={1} />
        </g>
        <Fill d={rectD(1330, 486, 360 * up1, 12, 6)} color={C.pine} op={0.9} seed={762} f="wcS" ink={false} />
        {v2 > 0 ? (
          <g opacity={v2}>
            {/* the hero photo becomes latte art */}
            <circle cx={1380} cy={340} r={58} fill={C.cream} stroke={C.ink} strokeWidth={2.5} />
            <circle cx={1380} cy={340} r={44} fill="#C79A6A" />
            <path d="M 1380 362 C 1350 336 1360 316 1380 330 C 1400 316 1410 336 1380 362 Z" fill={C.cream} />
            <Fill d={ellD(1690, 280, 30, 30)} color={C.pine} op={0.9} seed={763} f="wcS" />
            <HText x={1690} y={294} size={34} anchor="middle" color={C.cream}>2</HText>
          </g>
        ) : null}
        {/* quality line goes up */}
        <g opacity={ramp(f, 266, 280)}>
          <R s={P('M 1330 900 L 1420 888 L 1500 892 L 1590 870 L 1690 838')} seed={764} o={{...THIN, stroke: C.green, strokeWidth: 5}} draw={ramp(f, 266, 300)} />
          <path d="M 1676 828 L 1700 834 L 1690 856" fill="none" stroke={C.green} strokeWidth={5} strokeLinecap="round" opacity={ramp(f, 296, 302)} />
        </g>
      </g>
      <g opacity={ramp(f, 76, 86)}>
        <Fill d={rectD(1310, 560, 400, 250, 10)} color={C.pine} op={0.7} seed={765} f="wcS" />
        <circle cx={1510} cy={670} r={46} fill={C.cream} />
        <path d="M 1494 646 L 1530 670 L 1494 694 Z" fill={C.crimson} stroke={C.ink} strokeWidth={2.5} />
        <Fill d={rectD(1330, 786, 360 * up2, 12, 6)} color={C.marigold} op={0.95} seed={766} f="wcS" ink={false} />
      </g>
      <Stamp x={960} y={540} t={ramp(f, 318, 340, E.linear)} text="Approved" seed={770} size={110} />
    </Shot>
  );
};

/* ------------------------------------------------------------------ */
/* B6 — How the money is shared                                       */
/* ------------------------------------------------------------------ */

const LEVELS = [50, 60, 70, 78, 80];
const ribbon = (a0: number, a1: number, b0: number, b1: number, y0: number, y1: number) => {
  const ym = (y0 + y1) / 2;
  return `M ${a0} ${y0} C ${a0} ${ym} ${b0} ${ym} ${b0} ${y1} L ${b1} ${y1} C ${b1} ${ym} ${a1} ${ym} ${a1} ${y0} Z`;
};

export const S6_1: React.FC = () => {
  const f = useCurrentFrame();
  const steps = [0, 140, 160, 180, 200];
  let lvl = 0;
  let mix = 0;
  for (let i = 1; i < steps.length; i++) {
    if (f >= steps[i]) {
      lvl = i;
    }
  }
  const prev = Math.max(0, lvl - 1);
  mix = lvl === 0 ? 1 : ramp(f, steps[lvl], steps[lvl] + 22, E.inOut);
  const member = lerp(LEVELS[prev], LEVELS[lvl], mix);
  const shares = [15, member, 85 - member];
  const draw = ramp(f, 6, 56, E.soft);
  const W = 420;
  const y0 = 330;
  const y1 = 650;
  const jars = [420, 960, 1500];
  const cols = [C.pine, C.crimson, C.marigold];
  let acc = 960 - W / 2;
  const tops = shares.map((s) => {
    const a0 = acc;
    acc += (s / 100) * W;
    return [a0, acc];
  });
  return (
    <Shot>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.2} f="wcL" />
      {/* the job's payment */}
      <Bloom cx={960} cy={200} rx={260} ry={160} color={C.marigold} op={0.35} />
      <ZCoin x={960} y={200} d={190} rotY={Math.sin(f / 26) * 0.9} tilt={0.18} />
      {/* three streams */}
      {shares.map((s, i) => {
        const w = Math.max(16, (s / 100) * W * 1.25);
        const [a0, a1] = tops[i];
        const d = ribbon(a0, a1, jars[i] - w / 2, jars[i] + w / 2, y0, y1);
        return (
          <g key={i} opacity={draw}>
            <clipPath id={`rib${i}`}>
              <rect x={0} y={0} width={1920} height={y0 + (y1 - y0) * draw} />
            </clipPath>
            <g clipPath={`url(#rib${i})`}>
              <Wash d={d} color={cols[i]} op={0.8} f="wcM" />
              <path d={d} fill="none" stroke={C.ink} strokeWidth={2.4} />
              {Array.from({length: 5}).map((_, k) => {
                // coins drifting down the stream through a seeded p5 noise flow field
                const t = (f / 46 + k / 5 + i * 0.13) % 1;
                const p = flowParticle(i * 10 + k, t, (u) => ({x: lerp((a0 + a1) / 2, jars[i], u * u * (3 - 2 * u)), y: lerp(y0, y1, u)}), Math.min(14, w * 0.18));
                return <Coin key={k} x={p.x} y={p.y} s={0.42} seed={860 + k} spin={f / 5 + k} />;
              })}
            </g>
          </g>
        );
      })}
      {/* jars */}
      <Jar x={420} y={900} s={0.66} seed={810} lid={-1} coins={Math.floor(ramp(f, 30, 260) * 4)} />
      <Jar x={960} y={900} s={0.66} seed={820} lid={-1} coins={Math.floor(ramp(f, 30, 260) * 12)} />
      <Jar x={1500} y={900} s={0.66} seed={830} lid={-1} coins={Math.floor(ramp(f, 30, 260) * 6)} />
      {/* Rajan earns for leading, not for doing: a guiding hand on his stream */}
      <g opacity={ramp(f, 226, 242)} transform={`translate(1640 760) rotate(${-12 + Math.sin(f / 10) * 4})`}>
        <Fill d="M -18 40 L -22 0 C -24 -10 -12 -12 -10 -2 L -10 -38 C -10 -48 2 -48 2 -38 L 2 -10 L 4 -44 C 4 -54 16 -54 16 -44 L 14 -8 L 18 -36 C 18 -46 30 -46 30 -36 L 26 6 C 26 30 16 40 6 44 Z" color={SKIN.rajan} op={0.85} seed={870} f="wcS" o={{strokeWidth: 2.2}} />
      </g>
      {/* who gets each */}
      <g opacity={ramp(f, 40, 56)}>
        <g transform="translate(420 790) scale(1.6)">
          <AppMark x={0} y={0} seed={840} />
        </g>
        <Avatar who="sita" x={960} y={790} r={52} expr={lvl >= 3 ? 'joy' : 'happy'} seed={841} />
        <Avatar who="rajan" x={1500} y={790} r={52} expr="content" seed={842} />
      </g>
      <g transform={`translate(420 1010) scale(${E.back(ramp(f, 64, 80))})`}>
        <HText x={0} y={0} size={84} anchor="middle" color={C.pine} font={DISPLAY} weight={800}>15%</HText>
      </g>
      <g transform={`translate(960 1010) scale(${E.back(ramp(f, 110, 126))})`}>
        <HText x={0} y={0} size={84} anchor="middle" color={C.crimson} font={DISPLAY} weight={800}>{`${Math.round(member)}%`}</HText>
      </g>
      <g transform={`translate(1500 1010) scale(${E.back(ramp(f, 222, 238))})`}>
        <HText x={0} y={0} size={84} anchor="middle" color={C.honeyDeep} font={DISPLAY} weight={800}>{`${Math.round(85 - member)}%`}</HText>
      </g>
      {/* the member's badge */}
      <g opacity={ramp(f, 104, 120)}>
        <Stars x={960 - (lvl * 60 * 1.15) / 2} y={560} n={lvl + 1} grow={lvl === 0 ? ramp(f, 104, 120) : ramp(f, steps[lvl], steps[lvl] + 16)} size={60} seed={851} />
      </g>
    </Shot>
  );
};

export const B5_SHOTS: [React.FC, number][] = [[S5_1, 400]];
export const B6_SHOTS: [React.FC, number][] = [[S6_1, 270]];

export {CheckBox, hn, Rc, OUT};
