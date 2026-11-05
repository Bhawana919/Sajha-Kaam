import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Character, EXPR, POSE, mixExpr} from '../../characters/Character';
import {HText, Shot, Wash, Bloom, rectD} from '../../lib/paint';
import {E, kf, ramp, clamp01} from '../../lib/anim';
import {C, SKIN} from '../../lib/theme';
import {Thread, Title, Label} from '../../props/kit';
import {AppHome, BigPhone, HoldingHand} from '../../props/big';
import {Calendar} from '../../props/sets';
import {Cast, MapBackdrop, MapThread, RoleTag, SITA_T, THREAD_MAIN} from './ThreadMap';
import {pointOn} from '../../lib/tools';
import {Folder} from './NewShots';

/* 4A — Rajan opens Sajha Kaam (rhymes with 2D) */
export const S4A: React.FC = () => {
  const f = useCurrentFrame();
  const tap = ramp(f, 18, 24);
  const app = ramp(f, 26, 80, E.soft);
  const e = f < 22 ? EXPR.overwhelmed : f < 46 ? mixExpr(EXPR.surprised, EXPR.thinking, ramp(f, 30, 46)) : mixExpr(EXPR.thinking, EXPR.happy, ramp(f, 46, 62));
  const press = f > 16 && f < 26 ? 1 : 0;
  return (
    <Shot cam={{x: 960, y: 540, z: 1}}>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.28} f="wcL" />
      <Character who="rajan" x={1440} y={1420} scale={2.75} facing={-1} expr={{...e, lookX: 0.9, lookY: 0.4}} pose={{...POSE.idle, head: 6, legs: 'hidden'}} />
      <BigPhone x={440} y={250} w={380} h={720} seed={410} rot={-4} glow={app}>
        {(sx, sy, sw, sh) => (
          <g>
            <g opacity={1 - tap}>
              <Calendar x={sx + 14} y={sy + 120} s={(sw - 28) / 370} p={1} seed={411} />
            </g>
            <AppHome sx={sx} sy={sy} sw={sw} sh={sh} p={app} seed={412} />
          </g>
        )}
      </BigPhone>
      <HoldingHand x={430} y={760} s={1.6} skin={SKIN.rajan} seed={413} />
      {/* thumb tap */}
      <g transform={`translate(${700 - press * 10} ${kf(f, [[8, 1100], [17, 640, E.out], [26, 650], [40, 1100, E.in]])})`}>
        <path d="M -26 0 C -26 -40 26 -40 26 0 L 30 200 L -30 200 Z" fill={SKIN.rajan} stroke={C.ink} strokeWidth={3} opacity={0.95} />
      </g>
      {press ? <circle cx={700} cy={640} r={40} fill="none" stroke={C.marigold} strokeWidth={5} opacity={0.8} /> : null}
    </Shot>
  );
};

/* 4B — the thread draws across the sheet */
export const S4B: React.FC = () => {
  const f = useCurrentFrame();
  const p = ramp(f, 16, 140, E.inOut);
  const q = ramp(f, 140, 168);
  const lookUp = (t: number) => (p > t ? mixExpr(EXPR.neutral, EXPR.surprised, ramp(p, t, t + 0.06)) : EXPR.sad);
  return (
    <Shot cam={{x: 960, y: 560, z: kf(f, [[0, 0.96], [180, 1.0]])}}>
      <MapBackdrop />
      <Cast exprs={{sita: lookUp(SITA_T - 0.02), bikash: lookUp(0.97), emma: q > 0.9 ? 'surprised' : 'worried', rajan: 'determined'}} />
      <MapThread p={p} q={q} />
    </Shot>
  );
};

/* 4C — punch in: roles */
export const S4C: React.FC = () => {
  const f = useCurrentFrame();
  const sm = (k: number) => mixExpr(EXPR.surprised, EXPR.happy, ramp(f, 8 + k * 8, 18 + k * 8));
  return (
    <Shot cam={{x: 960, y: 600, z: kf(f, [[0, 1.0], [75, 1.05]])}}>
      <MapBackdrop labels={1 - ramp(f, 10, 22)} />
      <Cast exprs={{emma: sm(0), rajan: sm(1), sita: sm(2), bikash: sm(3)}} />
      <MapThread p={1} q={1} />
      <RoleTag x={430} y={1010} t={ramp(f, 10, 22)} color={C.pine} seed={421}>Team Leader</RoleTag>
      {/* the work travels along the thread, home to Nepal */}
      {[0, 1].map((k) => {
        const t = ramp(f, 16 + k * 10, 66 + k * 10, E.inOut);
        if (t <= 0 || t >= 1) return null;
        const p = pointOn(THREAD_MAIN, k === 0 ? t * SITA_T : t);
        return <Folder key={k} x={p.x} y={p.y - 34} s={1.15} rot={Math.sin(f / 6 + k) * 6} seed={423 + k} color={k ? C.crimsonTint : C.marigold} />;
      })}
    </Shot>
  );
};

/* 5A — title card */
export const S5A: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Shot>
      <Bloom cx={960} cy={500} rx={700} ry={260} color={C.marigoldTint} op={0.4} />
      <Thread d="M -100 760 C 300 620 600 900 960 760 C 1320 620 1620 900 2020 760" p={ramp(f, 0, 50, E.inOut)} seed={430} w={22} />
      <Title x={960} y={480} size={150} t={ramp(f, 18, 60)}>Sajha Kaam</Title>
      <HText x={960} y={620} size={92} anchor="middle" color={C.crimson} reveal={ramp(f, 50, 80)} weight={700}>
        साझा काम
      </HText>
    </Shot>
  );
};

export const B2_SHOTS: [React.FC, number][] = [
  [S4A, 90],
  [S4B, 180],
  [S4C, 75],
  [S5A, 105],
];

export {Label, clamp01, Character};
