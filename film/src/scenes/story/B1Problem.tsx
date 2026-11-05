import React from 'react';
import {Series, useCurrentFrame} from 'remotion';
import {Character, EXPR, POSE, mixExpr, mixPose} from '../../characters/Character';
import {Cam, HText, Shot, Wash, Bloom, rectD, ellD} from '../../lib/paint';
import {E, act, kf, ramp, hn} from '../../lib/anim';
import {C, SKIN} from '../../lib/theme';
import {L, P, R, Rc} from '../../lib/rough';
import {Camera, Cup, Fill, Hatch, Laptop, BlankPage, SitePage, SpeechBubble, ThoughtBubble, THIN, OUT} from '../../props/kit';
import {BigPhone, BigScreen, HoldingHand, LaptopFront} from '../../props/big';
import {Avatar} from './B5B6';
import {CafeFront, CafeInterior, Calendar, Espresso, Ground, Gulls, House, KtmStreet, Lake, Mountains, NoticeBoard, Pagoda, Sea, ShopDoor, Ship, Skyline, Stupa, Sun} from '../../props/sets';

export const OTS_RECT = {x: 560, y: 150, w: 1200, h: 720};

/* ---------------- 1A  Melbourne establishing ---------------- */
export const S1A: React.FC = () => {
  const f = useCurrentFrame();
  const cam: Cam = {x: kf(f, [[8, 960], [135, 1290]]), y: kf(f, [[8, 520], [135, 600]]), z: kf(f, [[8, 0.94], [135, 1.2]])};
  return (
    <Shot
      cam={cam}
      overlay={
        <HText x={110} y={140} size={60} reveal={ramp(f, 48, 80)}>
          Melbourne
        </HText>
      }
    >
      <Bloom cx={1000} cy={420} rx={900} ry={360} color={C.marigoldTint} op={0.55 * ramp(f, 0, 40)} />
      <Sun x={880} y={kf(f, [[0, 640], [120, 250, E.out]])} r={64} t={ramp(f, 0, 30)} />
      <Skyline x={30} y={880} s={0.95} draw={ramp(f, 4, 70)} far />
      <Gulls x={250 + f * 0.6} y={260} seed={30} />
      <Ground x1={-600} x2={2600} y={880} seed={40} draw={ramp(f, 0, 30)} />
      <CafeFront x={1080} y={880} draw={ramp(f, 22, 100)} />
      <R s={L(-600, 960, 2600, 960)} seed={41} o={THIN} draw={ramp(f, 10, 50)} opacity={0.5} />
    </Shot>
  );
};

/* ---------------- 1B  Emma at the counter ---------------- */
export const S1B: React.FC = () => {
  const f = useCurrentFrame();
  const sigh = ramp(f, 38, 62);
  const e = mixExpr(EXPR.content, EXPR.worried, sigh);
  const look = kf(f, [[10, -0.2], [30, 0.6]]);
  const pose = {...POSE.idle, head: kf(f, [[30, 0], [50, -3], [66, 12]]), squash: kf(f, [[40, 0], [52, -0.015], [64, 0.03], [80, 0.02]])};
  return (
    <Shot cam={{x: 960, y: 540, z: kf(f, [[0, 1], [90, 1.05]])}}>
      <CafeInterior y={780} part="wall" />
      <Espresso x={1680} y={762} />
      <Character who="emma" x={1290} y={1120} scale={1.9} facing={-1} expr={{...e, lookX: look, lookY: 0.5}} pose={{...pose, legs: 'hidden'}} />
      <CafeInterior y={780} part="counter" />
      <Laptop x={740} y={772} s={1.3} seed={50} screen={<BlankPage seed={51} />} />
      <Cup x={1000} y={768} seed={52} />
    </Shot>
  );
};

/* ---------------- 1C  OTS: blank screen (match-cut source) ---------------- */
export const S1C: React.FC = () => {
  const f = useCurrentFrame();
  const z = kf(f, [[0, 1], [55, 1.03]]);
  return (
    <Shot cam={{x: 960, y: 540, z}}>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.25} f="wcL" />
      <BigScreen {...OTS_RECT} mode="blank" seed={60} />
      <Character who="emma" x={300} y={1740} scale={3.3} view="back" pose={{...POSE.idle, legs: 'hidden'}} />
    </Shot>
  );
};

/* ---------------- 1D  Emma imagines ---------------- */
const PromoDoodle: React.FC<{x: number; y: number; w: number; h: number; seed: number}> = ({x, y, w, h, seed}) => {
  const f = useCurrentFrame();
  return (
    <g>
      <Fill d={rectD(x, y, w, h, 8)} color={C.pine} op={0.75} seed={seed} f="wcS" />
      {Array.from({length: 7}).map((_, i) => (
        <rect key={i} x={x + 10 + i * ((w - 20) / 7)} y={y + 8} width={12} height={8} rx={2} fill={C.cream} opacity={0.8} />
      ))}
      {Array.from({length: 7}).map((_, i) => (
        <rect key={`b${i}`} x={x + 10 + i * ((w - 20) / 7)} y={y + h - 16} width={12} height={8} rx={2} fill={C.cream} opacity={0.8} />
      ))}
      <circle cx={x + w / 2} cy={y + h / 2} r={h * 0.22} fill={C.cream} />
      <path d={`M ${x + w / 2 - 12} ${y + h / 2 - 18} L ${x + w / 2 + 20} ${y + h / 2} L ${x + w / 2 - 12} ${y + h / 2 + 18} Z`} fill={C.crimson} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
      <rect x={x + 20} y={y + h - 34} width={(w - 40) * ((f % 90) / 90)} height={5} fill={C.marigold} />
    </g>
  );
};

const StrangerDoodle: React.FC<{cx: number; cy: number; seed: number}> = ({cx, cy, seed}) => (
  <g>
    <Fill d={rectD(cx - 120, cy - 80, 240, 150, 10)} color={C.inkSoft} op={0.25} seed={seed} f="wcS" />
    <Fill d={ellD(cx - 40, cy - 12, 34, 34)} color={C.inkSoft} op={0.55} seed={seed + 1} f="wcS" />
    <Fill d={`M ${cx - 86} ${cy + 60} C ${cx - 80} ${cy + 20} ${cx} ${cy + 20} ${cx + 6} ${cy + 60} Z`} color={C.inkSoft} op={0.55} seed={seed + 2} f="wcS" />
    <HText x={cx - 40} y={cy + 2} size={46} anchor="middle" color={C.cream}>?</HText>
    <HText x={cx + 66} y={cy + 20} size={80} anchor="middle" color={C.crimson}>?</HText>
  </g>
);

export const S1D: React.FC = () => {
  const f = useCurrentFrame();
  const doubt = ramp(f, 100, 120);
  const e0 = mixExpr(EXPR.hopeful, EXPR.thinking, ramp(f, 60, 80));
  const e = mixExpr(e0, EXPR.worried, doubt);
  const shake = f > 104 && f < 124 ? Math.sin((f - 104) * 0.9) * 5 : 0;
  const thinkT = ramp(f, 6, 22, E.out);
  const pose = {...mixPose(POSE.idle, POSE.think, thinkT), head: -4 + shake, legs: 'hidden' as const};
  const sag = doubt * 14;
  return (
    <Shot cam={{x: kf(f, [[0, 980], [150, 940]]), y: 540, z: 1}}>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.28} f="wcL" />
      <Bloom cx={1500} cy={200} rx={300} ry={200} color={C.marigoldTint} op={0.4} />
      <Character who="emma" x={1380} y={1300} scale={2.2} facing={-1} expr={{...e, lookX: doubt > 0.5 ? 0.3 : 0.9, lookY: doubt > 0.5 ? 0.6 : -0.8}} pose={pose} />
      <CafeInterior y={960} part="counter" x0={-100} x1={2100} seed={1370} />
      <g transform={`translate(0 ${sag})`} opacity={1 - doubt * 0.35}>
        <ThoughtBubble x={90} y={80} w={600} h={400} from={[1180, 420]} seed={72} t={ramp(f, 14, 34)}>
          <g transform="translate(170 170) scale(1.3)">
            <SitePage seed={73} p={ramp(f, 28, 60)} />
          </g>
        </ThoughtBubble>
        <ThoughtBubble x={720} y={70} w={430} h={300} from={[1180, 420]} seed={74} t={ramp(f, 40, 60)}>
          <PromoDoodle x={820} y={150} w={230} h={140} seed={75} />
        </ThoughtBubble>
      </g>
      <ThoughtBubble x={540} y={500} w={400} h={270} from={[1150, 560]} seed={76} t={ramp(f, 92, 106)}>
        <StrangerDoodle cx={740} cy={630} seed={77} />
      </ThoughtBubble>
    </Shot>
  );
};

/* ---------------- 2A  Rajan walks in ---------------- */
export const S2A: React.FC = () => {
  const f = useCurrentFrame();
  const walkT = ramp(f, 8, 62, E.soft);
  const rx = 150 + walkT * 520;
  const walking = f > 8 && f < 60;
  const stopLean = kf(f, [[56, 0], [62, -6], [70, 2], [76, 0]]);
  const door = kf(f, [[0, 1], [10, 0.2, E.out], [60, 0.25], [75, 1, E.inOut]]);
  const wave = act(f, 66, 16, 0, 1, 0.15, 0.1);
  const emWave = act(f, 46, 18, 0, 1);
  return (
    <Shot cam={{x: kf(f, [[0, 900], [80, 980]]), y: 540, z: 1}}>
      <CafeInterior y={720} part="wall" x0={-300} x1={2300} />
      {/* doorway */}
      <Fill d={rectD(60, 300, 230, 520)} color={C.marigoldTint} op={0.6} seed={80} f="wcM" />
      <Bloom cx={175} cy={560} rx={140} ry={240} color={C.marigoldTint} op={0.6} />
      <g transform={`translate(60 0) scale(${door} 1) translate(-60 0)`}>
        <Fill d={rectD(60, 300, 230, 520)} color={C.pine} op={0.75} seed={81} f="wcM" />
        <Fill d={rectD(90, 330, 170, 200)} color={C.pineTint} op={0.4} seed={82} f="wcS" />
      </g>
      {/* bell */}
      <R s={L(300, 290, 300, 310)} seed={83} o={THIN} />
      <g transform={`rotate(${f < 30 ? Math.sin(f * 0.9) * 18 * (1 - f / 30) : 0} 300 310)`}>
        <Fill d="M 286 336 C 286 314 314 314 314 336 Z" color={C.marigold} op={0.9} seed={84} f="wcS" />
      </g>
      {f < 28 ? <R s={P('M 330 300 L 350 290 M 334 320 L 358 320 M 270 300 L 250 290')} seed={85} o={THIN} opacity={1 - f / 28} /> : null}
      <Ground x1={-300} x2={2300} y={960} seed={86} color={C.crimsonTint} />
      <Character who="emma" x={1470} y={1000} scale={1.28} facing={-1} expr={f > 40 ? 'happy' : 'neutral'} pose={{...mixPose(POSE.idle, POSE.wave, emWave), legs: 'hidden'}} />
      <CafeInterior y={720} part="counter" cx0={1050} x1={2300} />
      <Espresso x={1800} y={702} s={0.9} />
      <Character
        who="rajan"
        x={rx}
        y={980}
        scale={1.3}
        expr="happy"
        pose={{...mixPose(POSE.idle, POSE.wave, wave), legs: walking ? 'walk' : 'stand', walk: f * 0.34, lean: stopLean + (walking ? 4 : 0)}}
      />
    </Shot>
  );
};

/* ---------------- 2B  Two-shot conversation ---------------- */
export const S2B: React.FC = () => {
  const f = useCurrentFrame();
  const waveDown = 1 - ramp(f, 0, 14);
  const point = act(f, 18, 18, 0, 1);
  const rajanE = mixExpr(EXPR.happy, EXPR.thinking, ramp(f, 40, 60));
  return (
    <Shot cam={{x: 960, y: 540, z: kf(f, [[0, 1], [110, 1.03]])}}>
      <CafeInterior y={760} part="wall" />
      <Character who="emma" x={1380} y={1015} scale={1.5} facing={-1} expr="hopeful" talk={f > 14 && f < 84 ? 1 : 0} pose={{...mixPose(POSE.idle, POSE.point, point), legs: 'hidden', head: -3}} />
      <CafeInterior y={760} part="counter" cx0={820} />
      <Laptop x={1060} y={752} s={1.05} seed={90} screen={<BlankPage seed={91} />} />
      <Character who="rajan" x={540} y={1070} scale={1.5} expr={{...rajanE, lookX: 0.9}} pose={{...mixPose(POSE.cup, POSE.wave, waveDown), head: 2}} frontProp={<Cup x={0} y={8} s={0.9} seed={92} />} />
      <SpeechBubble x={930} y={70} w={620} h={280} tail={[1320, 440]} seed={93} t={ramp(f, 26, 40)}>
        <g transform="translate(980 108) scale(1.15)">
          <SitePage seed={94} p={1} />
        </g>
        <g transform="translate(1250 120)">
          <Fill d={rectD(0, 0, 250, 150, 8)} color={C.pine} op={0.7} seed={95} f="wcS" />
          <path d="M 110 50 L 150 75 L 110 100 Z" fill={C.cream} stroke={C.ink} strokeWidth={2.4} />
        </g>
      </SpeechBubble>
    </Shot>
  );
};

/* ---------------- 2C  Rajan: "I know people." ---------------- */
export const S2C: React.FC = () => {
  const f = useCurrentFrame();
  const nod = kf(f, [[6, 0], [12, -4], [20, 10], [28, 0], [34, 8], [42, 0]]);
  return (
    <Shot cam={{x: 960, y: 540, z: kf(f, [[0, 1], [70, 1.05]])}}>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.3} f="wcL" />
      <Bloom cx={300} cy={300} rx={200} ry={200} color={C.marigold} op={0.25} />
      <Bloom cx={1600} cy={260} rx={160} ry={160} color={C.crimsonTint} op={0.3} />
      <Character who="rajan" x={640} y={1330} scale={2.7} expr="happy" talk={f > 14 && f < 40 ? 1 : 0} pose={{...POSE.idle, head: nod, legs: 'hidden'}} />
      {/* "I know people": young faces from home pop into his bubble */}
      <SpeechBubble x={1080} y={180} w={640} h={230} tail={[960, 470]} seed={100} t={ramp(f, 12, 24)}>
        {(['sita', 'bikash', 'kid1'] as const).map((w, i) => (
          <g key={w} opacity={ramp(f, 18 + i * 8, 26 + i * 8)} transform={`translate(0 ${(1 - E.back(ramp(f, 18 + i * 8, 30 + i * 8))) * 30})`}>
            <Avatar who={w} x={1220 + i * 180} y={295} r={70} expr="happy" seed={101 + i} />
          </g>
        ))}
      </SpeechBubble>
    </Shot>
  );
};

/* ---------------- 2D  Calendar overflows ---------------- */
export const S2D: React.FC<{mode?: 'busy' | 'app'}> = ({mode = 'busy'}) => {
  const f = useCurrentFrame();
  const fill = ramp(f, 4, 66, E.soft);
  const shake = f > 50 && f < 74 ? hn(f) * 4 : 0;
  const e = mixExpr(EXPR.content, EXPR.overwhelmed, ramp(f, 36, 56));
  return (
    <Shot cam={{x: 960 + shake, y: 540, z: 1}}>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.28} f="wcL" />
      <Character who="rajan" x={1440} y={1420} scale={2.75} facing={-1} expr={{...e, lookX: 0.9, lookY: 0.4}} pose={{...POSE.idle, head: 6, legs: 'hidden'}} />
      <BigPhone x={440} y={250} w={380} h={720} seed={110} rot={-4}>
        {(sx, sy, sw) => <Calendar x={sx + 14} y={sy + 120} s={(sw - 28) / 370} p={fill} seed={111} />}
      </BigPhone>
      <HoldingHand x={430} y={760} s={1.6} skin={SKIN.rajan} seed={112} />
    </Shot>
  );
};

/* ---------------- 3A  Travel across the sheet ---------------- */
export const S3A: React.FC = () => {
  const f = useCurrentFrame();
  const x = kf(f, [[12, 960], [135, 5250, E.inOut]]);
  const z = kf(f, [[12, 1], [70, 0.74, E.inOut], [135, 1, E.inOut]]);
  return (
    <Shot
      cam={{x, y: 540, z}}
      overlay={
        <HText x={960} y={170} size={66} anchor="middle" reveal={ramp(f, 118, 145)}>
          Pokhara
        </HText>
      }
    >
      <Bloom cx={2600} cy={300} rx={2600} ry={300} color={C.marigoldTint} op={0.35} />
      <Skyline x={40} y={800} s={0.8} far />
      <CafeFront x={1000} y={800} s={0.55} />
      <Ground x1={-1200} x2={1860} y={800} seed={120} />
      <Sea x={1850} y={800} w={2500} seed={121} />
      <Ship x={2900} y={820} seed={122} />
      <Gulls x={2300 + f} y={480} seed={123} n={4} />
      <Mountains x={4300} y={800} draw={ramp(f, 40, 120)} />
      <Ground x1={4340} x2={7000} y={800} seed={124} color={C.sage} />
      <Lake x={4950} y={880} w={700} draw={ramp(f, 70, 130)} />
      <House x={4560} y={960} s={0.7} seed={125} draw={ramp(f, 80, 120)} />
      <House x={5900} y={980} s={0.8} seed={126} roof={C.pine} draw={ramp(f, 90, 130)} />
      <g clipPath="url(#routeClip)">
        <path d="M 1360 520 C 2200 160 3600 160 5250 520" stroke={C.crimson} strokeWidth={5} strokeDasharray="6 18" strokeLinecap="round" fill="none" />
      </g>
      <defs>
        <clipPath id="routeClip">
          <rect x={0} y={0} width={x + 300} height={1200} />
        </clipPath>
      </defs>
    </Shot>
  );
};

/* ---------------- 3B  Match cut: Sita's screen ---------------- */
const SCR = {x: 700, y: 500, w: 420, h: 252};
export const S3B: React.FC = () => {
  const f = useCurrentFrame();
  const t = ramp(f, 14, 62, E.inOut);
  const z0 = OTS_RECT.w / SCR.w;
  const c0 = {x: SCR.x + SCR.w / 2 - (OTS_RECT.x + OTS_RECT.w / 2 - 960) / z0, y: SCR.y + SCR.h / 2 - (OTS_RECT.y + OTS_RECT.h / 2 - 540) / z0};
  // interpolate in log-zoom so the pull-back feels even
  const z = Math.exp(Math.log(z0) * (1 - t));
  const k = (z0 - z) / (z0 - 1 || 1);
  const cam: Cam = {x: c0.x + (960 - c0.x) * k, y: c0.y + (540 - c0.y) * k, z};
  const toScreen = (wx: number, wy: number) => [960 + (wx - cam.x) * z, 540 + (wy - cam.y) * z];
  const [sx, sy] = toScreen(SCR.x, SCR.y);
  const proud = ramp(f, 70, 86);
  const e = mixExpr(EXPR.determined, EXPR.proud, proud);
  const present = act(f, 72, 16, 0, 1);
  return (
    <Shot
      cam={cam}
      overlay={<BigScreen x={sx} y={sy} w={SCR.w * z} h={SCR.h * z} mode={f < 40 ? 'code' : 'site'} p={f < 40 ? ramp(f, 0, 36) : ramp(f, 40, 80)} seed={130} bezel={false} lw={Math.max(0.6, z / 2.6)} />}
    >
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.crimsonTint} op={0.2} f="wcL" />
      {/* window to the mountains */}
      <Fill d={rectD(150, 120, 520, 330)} color={C.cream} op={0.5} seed={131} f="wcS" />
      <clipPath id="win3b">
        <rect x={150} y={120} width={520} height={330} />
      </clipPath>
      <g clipPath="url(#win3b)">
        <Wash d={rectD(150, 120, 520, 330)} color={C.marigoldTint} op={0.4} f="wcM" />
        <Mountains x={110} y={470} s={0.32} />
      </g>
      <R s={L(410, 120, 410, 450)} seed={132} o={OUT} />
      <Character who="sita" x={1470} y={1060} scale={1.8} facing={-1} expr={{...e, lookX: proud > 0.5 ? -0.4 : 0.8, lookY: proud > 0.5 ? 0 : 0.4}} pose={{...mixPose(POSE.typing, POSE.point, present), legs: 'hidden', head: proud * -6}} />
      <Fill d={rectD(380, 780, 1340, 40)} color={C.marigold} op={0.5} seed={133} f="wcM" />
      <Fill d={rectD(420, 820, 1260, 320)} color={C.crimson} op={0.25} seed={134} f="wcL" />
      <LaptopFront sx={SCR.x} sy={SCR.y} sw={SCR.w} sh={SCR.h} seed={135} />
      <Cup x={1220} y={778} s={0.9} seed={136} />
    </Shot>
  );
};

/* ---------------- 3C  Sita walks to the notice board ---------------- */
const HugLaptop = <g><Fill d={rectD(-30, -50, 70, 50, 4)} color={C.inkSoft} op={0.5} seed={140} f="wcS" /></g>;
export const S3C: React.FC = () => {
  const f = useCurrentFrame();
  const wt = ramp(f, 0, 46, E.soft);
  const walking = f < 44;
  const lean = kf(f, [[44, 4], [50, -6], [58, 1], [64, 0]]);
  return (
    <Shot cam={{x: kf(f, [[0, 900], [70, 1000]]), y: 540, z: 1}}>
      <Bloom cx={900} cy={300} rx={1100} ry={260} color={C.marigoldTint} op={0.35} />
      <g opacity={0.55}>
        <Mountains x={-200} y={700} s={0.55} />
      </g>
      <Ground x1={-400} x2={2400} y={700} seed={141} color={C.sage} />
      <House x={300} y={700} s={0.9} seed={142} />
      <NoticeBoard x={1420} y={680} s={1.05} seed={143} />
      <Character who="sita" x={200 + wt * 640} y={1010} scale={1.6} expr="hopeful" pose={{...POSE.hug, legs: walking ? 'walk' : 'stand', walk: f * 0.34, lean, head: -4}} frontProp={HugLaptop} />
    </Shot>
  );
};

/* ---------------- 3D  HOLD: "Experience required" ---------------- */
export const S3D: React.FC = () => {
  const f = useCurrentFrame();
  const fall = ramp(f, 24, 56, E.inOut);
  const e = mixExpr({...EXPR.hopeful, lookX: 0.9, lookY: -0.7}, EXPR.sad, fall);
  const pose = {...mixPose(POSE.hug, POSE.slump, ramp(f, 40, 70)), legs: 'hidden' as const, head: -6 + fall * 18};
  return (
    <Shot cam={{x: 960, y: 540, z: kf(f, [[0, 1], [100, 1.06]])}}>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.sage} op={0.25} f="wcL" />
      <Character who="sita" x={640} y={1330} scale={2.8} expr={e} pose={pose} frontProp={HugLaptop} />
      <g transform="rotate(-2 1480 480)">
        <Fill d={rectD(1240, 140, 480, 660)} color={C.cream} op={0.85} seed={150} f="wcM" knock={C.cream} />
        <circle cx={1480} cy={164} r={12} fill={C.pine} />
        <R s={L(1290, 230, 1650, 230)} seed={151} o={THIN} opacity={0.5} />
        <R s={L(1290, 270, 1600, 270)} seed={152} o={THIN} opacity={0.5} />
        <HText x={1480} y={460} size={82} anchor="middle" color={C.crimson} widthFactor={0.45}>
          Experience
        </HText>
        <HText x={1480} y={560} size={82} anchor="middle" color={C.crimson} widthFactor={0.45}>
          required
        </HText>
        <R s={P(rectD(1270, 370, 420, 230, 18))} seed={153} o={{...THIN, stroke: C.crimson, strokeWidth: 5}} />
      </g>
    </Shot>
  );
};

/* ---------------- 3E  Kathmandu ---------------- */
export const S3E: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Shot
      cam={{x: kf(f, [[0, -250], [72, 1060, E.inOut]]), y: 540, z: 1}}
      overlay={
        <HText x={960} y={150} size={66} anchor="middle" reveal={ramp(f, 58, 84)}>
          Kathmandu
        </HText>
      }
    >
      <Bloom cx={600} cy={300} rx={1600} ry={280} color={C.marigoldTint} op={0.35} />
      <g opacity={0.6}>
        <Mountains x={-2100} y={780} s={1} />
      </g>
      <Ground x1={-2400} x2={2600} y={820} seed={160} />
      <Pagoda x={320} y={820} s={0.75} draw={ramp(f, 10, 50)} />
      <Stupa x={920} y={820} s={1.05} draw={ramp(f, 20, 70)} />
      <KtmStreet x={1420} y={820} draw={ramp(f, 30, 75)} />
      <Character who="bikash" x={1560} y={1000} scale={1.25} facing={-1} expr={{...EXPR.determined, lookX: 0.9}} pose="camera" frontProp={<Camera x={-6} y={-2} s={1} seed={161} rec />} />
    </Shot>
  );
};

/* ---------------- 3F  Bikash at the shop door ---------------- */
const PocketFlap = <path d="M -12 2 L 12 2 L 9 26 L -9 26 Z" fill={C.cream} stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />;
export const S3F: React.FC = () => {
  const f = useCurrentFrame();
  const fall = ramp(f, 34, 52);
  const e = mixExpr({...EXPR.hopeful, lookX: 0.8, lookY: -0.5}, EXPR.sad, fall);
  const pk = act(f, 54, 18, 0, 1, 0.1, 0.06);
  const pose = {...mixPose(POSE.holdOut, POSE.pockets, pk), head: kf(f, [[50, 0], [72, 14]])};
  return (
    <Shot cam={{x: 960, y: 540, z: 1}}>
      <Ground x1={-300} x2={2300} y={1000} seed={170} />
      <ShopDoor x={1270} y={1000} sign={ramp(f, 8, 30)} />
      <Character who="bikash" x={640} y={1000} scale={1.4} expr={e} pose={pose} frontProp={pk < 0.5 ? <Camera x={6} y={-6} s={0.9} seed={171} /> : PocketFlap} backProp={pk > 0.5 ? PocketFlap : undefined} />
    </Shot>
  );
};

export const B1_SHOTS: [React.FC, number][] = [
  [S1A, 135],
  [S1B, 90],
  [S1C, 55],
  [S1D, 150],
  [S2A, 85],
  [S2B, 110],
  [S2C, 70],
  [S2D, 85],
  [S3A, 150],
  [S3B, 115],
  [S3C, 70],
  [S3D, 100],
  [S3E, 100],
  [S3F, 100],
];

export const B1Problem: React.FC = () => (
  <Series>
    {B1_SHOTS.map(([Comp, d], i) => (
      <Series.Sequence key={i} durationInFrames={d}>
        <Comp />
      </Series.Sequence>
    ))}
  </Series>
);

export {Hatch, Rc, Pagoda, Stupa, Sea};
