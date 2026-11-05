import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Character, EXPR, POSE, Who, mixExpr, mixPose} from '../../characters/Character';
import {HText, Shot, Wash, Bloom, rectD, ellD} from '../../lib/paint';
import {E, act, kf, ramp, clamp01, hn, lerp} from '../../lib/anim';
import {C, DISPLAY} from '../../lib/theme';
import {L, P, R, Rc} from '../../lib/rough';
import {DhakaSwatch, Fill, Stars, THIN, OUT, SitePage, Cup} from '../../props/kit';
import {Ground, Mountains, NoticeBoard, House} from '../../props/sets';
import {Avatar, Stamp} from './B5B6';
import {CheckBox, Tick} from './B3B4';
import {RoleTag} from './ThreadMap';
import {ZStar} from '../../lib/tools';

/** A hop between two points: anticipation squash, stretch in the air, land squash. */
const hop = (f: number, start: number, a: [number, number], b: [number, number], h = 120) => {
  const t = clamp01((f - start) / 22);
  if (f < start) return {x: a[0], y: a[1], squash: 0, lift: 0};
  if (t < 0.25) return {x: a[0], y: a[1], squash: Math.sin((t / 0.25) * Math.PI) * 0.1, lift: 0};
  if (t < 0.8) {
    const k = (t - 0.25) / 0.55;
    const e = E.inOut(k);
    return {x: lerp(a[0], b[0], e), y: lerp(a[1], b[1], e) - Math.sin(k * Math.PI) * h, squash: -0.08 * Math.sin(k * Math.PI), lift: 0};
  }
  return {x: b[0], y: b[1], squash: Math.sin(((t - 0.8) / 0.2) * Math.PI) * 0.09, lift: 0};
};

export const Shield: React.FC<{x: number; y: number; s?: number; t?: number; seed: number}> = ({x, y, s = 1, t = 1, seed}) => {
  if (t <= 0) return null;
  const d = 'M 0 -34 L 28 -24 C 28 6 18 24 0 34 C -18 24 -28 6 -28 -24 Z';
  return (
    <g transform={`translate(${x} ${y}) scale(${s * E.back(clamp01(t))})`}>
      <Fill d={d} color={C.pine} op={0.9} seed={seed} f="wcS" knock={C.cream} o={{strokeWidth: 2.4}} />
      <path d="M -12 0 L -3 10 L 14 -10" stroke={C.cream} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* B7 — Promotion staircase                                           */
/* ------------------------------------------------------------------ */

const STEP = (i: number) => ({x: 250 + i * 300, y: 900 - i * 120});

const RuleChip: React.FC<{x: number; y: number; icon: 'jobs' | 'first' | 'time'; label: string; lit: number; seed: number}> = ({x, y, icon, label, lit, seed}) => (
  <g>
    <Fill d={rectD(x, y, 200, 92, 20)} color={lit > 0.5 ? C.pineTint : C.cream} op={0.7} seed={seed} f="wcS" knock={C.cream} />
    <g transform={`translate(${x + 48} ${y + 46})`}>
      {icon === 'jobs' ? (
        <>
          <R s={Rc(-18, -24, 36, 48)} seed={seed + 1} o={{...THIN, strokeWidth: 2.4}} />
          <R s={P('M -9 0 L -2 8 L 11 -10')} seed={seed + 2} o={{...THIN, stroke: C.pine, strokeWidth: 4}} />
        </>
      ) : icon === 'first' ? (
        <>
          <R s={{t: 'ellipse', x: 0, y: 0, w: 48, h: 48}} seed={seed + 1} o={{...THIN, strokeWidth: 2.4}} />
          <R s={{t: 'ellipse', x: 0, y: 0, w: 22, h: 22}} seed={seed + 2} o={{...THIN, stroke: C.crimson, strokeWidth: 3}} />
          <circle r={4} fill={C.crimson} />
        </>
      ) : (
        <>
          <R s={{t: 'ellipse', x: 0, y: 0, w: 48, h: 48}} seed={seed + 1} o={{...THIN, strokeWidth: 2.4}} />
          <R s={P('M 0 0 L 0 -16 M 0 0 L 12 6')} seed={seed + 2} o={{...THIN, strokeWidth: 3}} />
        </>
      )}
    </g>
    {lit > 0.5 ? <R s={P(`M ${x + 120} ${y + 46} L ${x + 140} ${y + 66} L ${x + 180} ${y + 26}`)} seed={seed + 9} o={{...THIN, stroke: C.pine, strokeWidth: 6}} /> : null}
  </g>
);

export const S7_1: React.FC = () => {
  const f = useCurrentFrame();
  const hops = [80, 130, 180, 230];
  let pos = {x: STEP(0).x + 150, y: STEP(0).y, squash: 0, lift: 0};
  let level = 0;
  hops.forEach((h, i) => {
    if (f >= h) {
      pos = hop(f, h, [STEP(i).x + 150, STEP(i).y], [STEP(i + 1).x + 150, STEP(i + 1).y]);
      if (f >= h + 18) level = i + 1;
    }
  });
  const airborne = hops.some((h) => f > h + 5 && f < h + 18);
  const e = level === 4 ? EXPR.joy : airborne ? EXPR.happy : EXPR.determined;
  // the rule chips light up before each hop
  const litFor = (k: number) => hops.reduce((acc, h) => (f > h - 36 + k * 9 && f < h + 10 ? 1 : acc), 0);
  return (
    <Shot
      cam={{x: kf(f, [[0, 760], [250, 1160]]), y: kf(f, [[0, 640], [250, 520]]), z: kf(f, [[0, 1.1], [250, 1.0]])}}
      overlay={
        <g>
          <RuleChip x={90} y={50} icon="jobs" label="jobs" lit={litFor(0)} seed={930} />
          <RuleChip x={310} y={50} icon="first" label="first try" lit={litFor(1)} seed={935} />
          <RuleChip x={530} y={50} icon="time" label="on time" lit={litFor(2)} seed={940} />
        </g>
      }
    >
      <Wash d={rectD(-200, -200, 2400, 1500)} color={C.marigoldTint} op={0.22} f="wcL" />
      {[0, 1, 2, 3, 4].map((i) => {
        const s = STEP(i);
        return (
          <g key={i}>
            <Fill d={rectD(s.x, s.y, 300, 1200 - s.y)} color={C.marigold} op={0.2 + i * 0.12} seed={900 + i} f="wcM" />
            <Stars x={s.x + 150 - (i * 34 * 1.15) / 2} y={s.y + 64} n={i + 1} size={34} seed={910 + i * 6} />
          </g>
        );
      })}
      <Character who="sita" x={pos.x} y={pos.y} scale={0.85} expr={e} pose={{...(level === 4 ? POSE.cheer : POSE.idle), squash: pos.squash, legs: airborne ? 'jump' : 'stand'}} />
    </Shot>
  );
};

export const S7_2: React.FC = () => {
  const f = useCurrentFrame();
  const note = ramp(f, 40, 70, E.inOut);
  const kidTry = kf(f, [[120, 0], [150, 1, E.soft], [160, 0.86, E.out], [175, 0.9]]);
  const blocked = ramp(f, 150, 160);
  return (
    <Shot cam={{x: 960, y: 540, z: kf(f, [[0, 1.0], [240, 1.03]])}}>
      <Wash d={rectD(-200, -200, 2400, 1500)} color={C.marigoldTint} op={0.22} f="wcL" />
      <Fill d={rectD(300, 70, 1320, 950, 16)} color={C.cream} op={0.85} seed={950} f="wcM" knock={C.cream} />
      <DhakaSwatch x={300} y={70} w={1320} h={26} seed={951} />
      <HText x={960} y={180} size={76} anchor="middle" reveal={ramp(f, 4, 24)}>Fair play</HText>
      {/* row A: lower or pause, with a reason the member sees */}
      <g opacity={ramp(f, 16, 30)}>
        <Avatar who="rajan" x={450} y={360} r={70} expr="neutral" seed={952} />
        <R s={L(540, 360, 680, 360)} seed={953} o={{...THIN, strokeWidth: 3}} />
        <Stars x={740} y={340} n={2} size={44} seed={954} />
        <R s={P('M 760 384 L 770 404 L 780 384')} seed={958} o={{...THIN, stroke: C.crimson, strokeWidth: 4}} />
        {/* pause */}
        <g opacity={ramp(f, 30, 40)}>
          <rect x={836} y={318} width={12} height={44} rx={3} fill={C.ink} />
          <rect x={858} y={318} width={12} height={44} rx={3} fill={C.ink} />
        </g>
        {/* the reason note travels to Sita */}
        <g transform={`translate(${lerp(940, 1240, note)} ${360 - Math.sin(note * Math.PI) * 70}) rotate(${-6 + note * 10})`}>
          <Fill d={rectD(-80, -46, 160, 92, 8)} color={C.marigoldTint} op={0.8} seed={959} f="wcS" knock={C.cream} />
          <R s={L(-50, -16, 50, -16)} seed={957} o={{...THIN, strokeWidth: 3}} />
          <R s={L(-50, 4, 36, 4)} seed={956} o={THIN} />
          <R s={L(-50, 22, 44, 22)} seed={955} o={THIN} />
        </g>
        <Avatar who="sita" x={1460} y={360} r={70} expr={note > 0.9 ? 'thinking' : 'neutral'} seed={960} />
        {/* eye: the member sees it */}
        <g opacity={ramp(f, 72, 82)} transform="translate(1460 470)">
          <path d="M -30 0 Q 0 -22 30 0 Q 0 22 -30 0 Z" fill={C.cream} stroke={C.ink} strokeWidth={3} />
          <circle r={8} fill={C.ink} />
        </g>
      </g>
      <R s={L(380, 560, 1540, 560)} seed={961} o={THIN} opacity={0.4} />
      {/* row B: at most 2 Starter jobs at once per Leader */}
      <g opacity={ramp(f, 90, 104)}>
        <Avatar who="rajan" x={450} y={760} r={70} expr="content" seed={962} />
        {[0, 1, 2].map((k) => (
          <g key={k}>
            <R s={P(rectD(640 + k * 240, 660, 190, 200, 18))} seed={963 + k} o={{...THIN, strokeWidth: 3}} />
            <Stars x={735 + k * 240} y={880} n={1} size={36} seed={966 + k} />
          </g>
        ))}
        <Avatar who="kid1" x={735} y={750} r={60} expr="happy" seed={970} />
        <Avatar who="kid2" x={975} y={750} r={60} expr="happy" seed={971} />
        <g transform={`translate(${lerp(1450, 1215, kidTry)} 0)`}>
          <Avatar who="kid3" x={0} y={750} r={60} expr={blocked > 0.5 ? 'surprised' : 'hopeful'} seed={972} />
        </g>
        {blocked > 0 ? <R s={P('M 1160 700 L 1270 810 M 1270 700 L 1160 810')} seed={973} o={{...THIN, stroke: C.crimson, strokeWidth: 9}} draw={blocked} /> : null}
        <g transform={`translate(1500 975) scale(${E.back(ramp(f, 160, 176))})`}>
          <HText x={0} y={0} size={96} anchor="middle" color={C.crimson} font={DISPLAY} weight={800}>2</HText>
        </g>
      </g>
    </Shot>
  );
};

/* ------------------------------------------------------------------ */
/* B8 — Leadership path                                               */
/* ------------------------------------------------------------------ */

const PaperStack: React.FC<{x: number; y: number; n: number; seed: number}> = ({x, y, n, seed}) => (
  <g>
    {Array.from({length: n}).map((_, i) => (
      <g key={i} transform={`rotate(${hn(i + seed) * 4} ${x} ${y - i * 16})`}>
        <Fill d={rectD(x - 120, y - i * 16 - 14, 240, 16, 2)} color={C.cream} op={0.7} seed={seed + i} f="wcS" knock={C.cream} o={{strokeWidth: 1.8}} />
        <circle cx={x + 90} cy={y - i * 16 - 6} r={5} fill={C.crimson} opacity={0.8} />
      </g>
    ))}
  </g>
);

export const S8_1: React.FC = () => {
  const f = useCurrentFrame();
  const tagL = ramp(f, 40, 52);
  const morph = ramp(f, 70, 84);
  const walk = ramp(f, 20, 90, E.soft);
  const stamp = ramp(f, 110, 130, E.linear);
  const shieldR = ramp(f, 132, 146);
  return (
    <Shot>
      <Wash d={rectD(-100, -100, 1060, 1300)} color={C.marigoldTint} op={0.28} f="wcL" />
      <Wash d={rectD(960, -100, 1060, 1300)} color={C.sage} op={0.28} f="wcL" />
      <R s={L(960, 40, 960, 1040)} seed={1000} o={{strokeWidth: 4}} />
      {/* left: a Mentor becomes a Leader at once */}
      <PaperStack x={470} y={900} n={9} seed={1001} />
      <Character who="sita" x={470} y={760} scale={1.2} expr={morph > 0.5 ? 'proud' : 'happy'} pose={morph > 0.5 ? 'wave' : 'idle'} />
      <Stars x={470 - (4 * 40 * 1.15) / 2} y={260} n={5} size={40} seed={1010} />
      <RoleTag x={470} y={170} t={morph} color={C.pine} seed={1016}>Leader</RoleTag>
      <Shield x={490} y={590} s={1.3} t={morph} seed={1017} />
      {/* right: others apply with proof; a reviewer checks */}
      <Fill d={rectD(1420, 640, 420, 40)} color={C.marigold} op={0.6} seed={1020} f="wcS" />
      <Fill d={rectD(1440, 680, 380, 300)} color={C.crimson} op={0.25} seed={1021} f="wcS" />
      <Character who="cust2" x={1700} y={830} scale={1.15} facing={-1} expr={stamp > 0.5 ? 'happy' : 'thinking'} pose={{...mixPose(POSE.idle, POSE.holdOut, ramp(f, 96, 110)), legs: 'hidden'}} />
      <Character
        who="kid3"
        x={lerp(1010, 1300, walk)}
        y={1000}
        scale={1.05}
        expr={shieldR > 0.5 ? 'joy' : 'hopeful'}
        pose={{...POSE.holdOut, legs: walk > 0 && walk < 1 ? 'walk' : 'stand', walk: f * 0.34}}
        frontProp={
          <g transform="rotate(-8)">
            <Fill d={rectD(-10, -46, 80, 60, 4)} color={C.marigold} op={0.8} seed={1023} f="wcS" />
          </g>
        }
      />
      <Stamp x={1630} y={800} t={stamp} text="Verified" seed={1024} size={70} />
      <Shield x={1310} y={800} s={1.2} t={shieldR} seed={1025} />
    </Shot>
  );
};

export const S8_2: React.FC = () => {
  const f = useCurrentFrame();
  const pin = act(f, 10, 20, 0, 1);
  const go = ramp(f, 70, 130, E.soft);
  const gate = ramp(f, 120, 132);
  return (
    <Shot cam={{x: 960, y: 540, z: kf(f, [[0, 1], [240, 1.04]])}}>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.22} f="wcL" />
      <Ground x1={-200} x2={2200} y={1000} seed={1030} color={C.crimsonTint} />
      {/* job board */}
      <Fill d={rectD(640, 220, 520, 400, 10)} color={C.marigold} op={0.45} seed={1031} f="wcM" />
      <R s={L(700, 620, 700, 1000)} seed={1032} o={OUT} />
      <R s={L(1100, 620, 1100, 1000)} seed={1033} o={OUT} />
      <g opacity={ramp(f, 20, 28)} transform="rotate(-3 900 400)">
        <Fill d={rectD(760, 270, 280, 300, 6)} color={C.cream} op={0.85} seed={1034} f="wcS" knock={C.cream} />
        <circle cx={900} cy={284} r={8} fill={C.crimson} />
        <g transform="translate(790 300) scale(1.1)">
          <SitePage seed={1035} p={1} />
        </g>
        <Cup x={900} y={540} s={1} seed={1036} steam={false} />
      </g>
      <Character who="emma" x={420} y={1000} scale={1.25} expr={f > 190 ? 'joy' : go > 0.6 ? 'happy' : 'hopeful'} pose={f > 180 ? mixPose(POSE.idle, POSE.point, ramp(f, 180, 196)) : mixPose(POSE.idle, POSE.point, pin)} />
      {/* leaders */}
      <Character who="rajan" x={lerp(1500, 1260, go)} y={1000} scale={1.15} facing={-1} expr="content" pose={{...POSE.idle, legs: go > 0 && go < 1 ? 'walk' : 'stand', walk: f * 0.34}} />
      <Shield x={lerp(1500, 1260, go) + 10} y={790} s={1.1} seed={1040} />
      {/* Emma chooses Rajan */}
      {f > 196 ? <R s={{t: 'ellipse', x: 1260, y: 830, w: 230, h: 420}} seed={1045} o={{...THIN, stroke: C.crimson, strokeWidth: 5}} draw={ramp(f, 196, 220)} /> : null}
      <Character who="sita" x={lerp(1700, 1430, go)} y={1000} scale={1.1} facing={-1} expr="proud" pose={{...POSE.idle, legs: go > 0 && go < 1 ? 'walk' : 'stand', walk: f * 0.34 + 1}} />
      <Shield x={lerp(1700, 1430, go) + 10} y={800} s={1.1} seed={1041} />
      <g opacity={1 - gate * 0.55}>
        <Character who="kid1" x={1820} y={1000} scale={1.05} facing={-1} expr={gate > 0.5 ? 'sad' : 'hopeful'} />
      </g>
      {gate > 0 ? (
        <g>
          <R s={L(1700, 760, 1700, 1000)} seed={1042} o={OUT} draw={gate} />
          <R s={L(1640, 800, 1760, 800)} seed={1043} o={{...OUT, stroke: C.crimson, strokeWidth: 8}} draw={gate} />
          <g opacity={ramp(f, 132, 146)}>
            <Fill d={rectD(1610, 700, 180, 56, 12)} color={C.cream} op={0.9} seed={1044} f="wcS" knock={C.cream} o={{strokeWidth: 2}} />
            <HText x={1700} y={738} size={28} anchor="middle" color={C.green}>verified only</HText>
          </g>
        </g>
      ) : null}
    </Shot>
  );
};

/* ------------------------------------------------------------------ */
/* B9 — Work Record                                                   */
/* ------------------------------------------------------------------ */

export const S9_1: React.FC = () => {
  const f = useCurrentFrame();
  const slam = (s: number) => ramp(f, s, s + 14, E.linear);
  const stampY = kf(f, [[0, -400], [20, 120, E.out], [30, 90], [38, 280, E.in], [44, 280], [56, -400, E.in]]);
  const shake = f > 38 && f < 44 ? hn(f) * 6 : 0;
  const rows = [
    {y: 380, t: ramp(f, 4, 16), s: 38},
    {y: 560, t: ramp(f, 66, 78), s: 92},
    {y: 740, t: ramp(f, 100, 112), s: 122},
  ];
  return (
    <Shot cam={{x: 960 + shake, y: 540 - shake, z: 1}}>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.25} f="wcL" />
      <g transform="rotate(-1.5 960 540)">
        <Fill d={rectD(520, 60, 880, 960, 8)} color={C.cream} op={0.85} seed={1100} f="wcM" knock={C.cream} />
        <DhakaSwatch x={520} y={60} w={880} h={24} seed={1101} />
        <Avatar who="sita" x={640} y={200} r={64} expr={f > 140 ? 'joy' : 'happy'} seed={1102} />
        <HText x={740} y={225} size={70}>Work Record</HText>
        {rows.map((r, i) => (
          <g key={i} opacity={r.t}>
            <R s={L(580, r.y + 70, 1340, r.y + 70)} seed={1110 + i} o={THIN} opacity={0.35} />
            {i === 0 ? (
              <g transform={`translate(590 ${r.y - 50}) scale(0.7)`}>
                <SitePage seed={1113} p={1} />
              </g>
            ) : i === 1 ? (
              <g>
                <Fill d={rectD(600, r.y - 50, 130, 90, 6)} color={C.pine} op={0.75} seed={1114} f="wcS" />
                <path d={`M 652 ${r.y - 22} L 684 ${r.y - 5} L 652 ${r.y + 12} Z`} fill={C.cream} />
              </g>
            ) : (
              <g>
                <Fill d={rectD(610, r.y - 54, 100, 104, 6)} color={C.marigoldTint} op={0.8} seed={1115} f="wcS" />
                {[0, 1, 2].map((k) => (
                  <R key={k} s={L(626, r.y - 30 + k * 26, 694, r.y - 30 + k * 26)} seed={1116 + k} o={THIN} />
                ))}
              </g>
            )}
            <R s={L(790, r.y - 20, 1000, r.y - 20)} seed={1120 + i} o={{...THIN, strokeWidth: 5}} opacity={0.7} />
            <R s={L(790, r.y + 14, 940, r.y + 14)} seed={1123 + i} o={THIN} opacity={0.5} />
            <Stamp x={1190} y={r.y} t={slam(r.s)} text="Verified" seed={1130 + i * 3} size={50} rot={-10 + i * 4} />
          </g>
        ))}
        {/* badge */}
        <g opacity={ramp(f, 132, 142)}>
          <Fill d={ellD(1240, 910, 120, 74)} color={C.marigoldTint} op={0.7} seed={1140} f="wcS" knock={C.cream} />
          <ZStar x={f > 150 ? 1200 : 1240} y={906} r={30} rotY={(1 - ramp(f, 132, 160)) * Math.PI * 2} scale={E.back(ramp(f, 132, 146))} />
          {f > 150 ? <ZStar x={1280} y={906} r={30} rotY={(1 - ramp(f, 150, 176)) * Math.PI * 2} scale={E.back(ramp(f, 150, 166))} /> : null}
        </g>
      </g>
      {/* the rubber stamp */}
      <g transform={`translate(1190 ${stampY})`}>
        <Fill d={rectD(-40, -220, 80, 150, 20)} color={C.crimson} op={0.75} seed={1150} f="wcS" />
        <Fill d={rectD(-110, -80, 220, 70, 10)} color={C.inkSoft} op={0.6} seed={1151} f="wcS" />
      </g>
    </Shot>
  );
};

export const S9_2: React.FC = () => {
  const f = useCurrentFrame();
  const raise = act(f, 20, 22, 0, 1);
  const ok = ramp(f, 46, 80);
  const e = f < 46 ? EXPR.determined : EXPR.joy;
  return (
    <Shot cam={{x: 1000, y: 540, z: 1}}>
      <Bloom cx={900} cy={300} rx={1100} ry={260} color={C.marigoldTint} op={0.35} />
      <g opacity={0.55}>
        <Mountains x={-200} y={700} s={0.55} />
      </g>
      <Ground x1={-400} x2={2400} y={700} seed={1160} color={C.sage} />
      <House x={300} y={700} s={0.9} seed={1161} />
      <NoticeBoard x={1420} y={680} s={1.05} seed={1162} ok={ok} />
      <Character
        who="sita"
        x={840}
        y={1010}
        scale={1.6}
        expr={e}
        pose={mixPose(POSE.idle, POSE.handsUp, raise)}
        backProp={
          raise > 0.3 ? (
            <g transform="rotate(8)">
              <Fill d={rectD(-50, -130, 100, 130, 4)} color={C.cream} op={0.85} seed={1163} f="wcS" knock={C.cream} />
              <DhakaSwatch x={-50} y={-130} w={100} h={10} seed={1164} />
              <circle cx={24} cy={-30} r={12} fill="none" stroke={C.crimson} strokeWidth={3} />
            </g>
          ) : undefined
        }
      />
    </Shot>
  );
};

export const B7_SHOTS: [React.FC, number][] = [
  [S7_1, 330],
  [S7_2, 300],
];
export const B8_SHOTS: [React.FC, number][] = [
  [S8_1, 200],
  [S8_2, 250],
];
export const B9_SHOTS: [React.FC, number][] = [
  [S9_1, 190],
  [S9_2, 150],
];

export {CheckBox, Tick, Who};
