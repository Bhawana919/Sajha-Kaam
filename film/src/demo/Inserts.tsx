import React, {createContext, useContext} from 'react';

/** Inserts carry a short caption in the demo; the story film turns them off (story first, little text). */
export const InsertCaptions = createContext(true);
const Cap: React.FC<{children: React.ReactNode}> = ({children}) => (useContext(InsertCaptions) ? <>{children}</> : null);
import {useCurrentFrame} from 'remotion';
import {HText, Shot, Wash, Bloom, rectD, ellD} from '../lib/paint';
import {E, kf, ramp, lerp, hn} from '../lib/anim';
import {C, SKIN} from '../lib/theme';
import {L, P, R} from '../lib/rough';
import {AppMark, Coin, Fill, THIN} from '../props/kit';
import {AppHome, BigPhone, HoldingHand} from '../props/big';
import {Avatar} from '../scenes/story/B5B6';
import {Jar} from '../scenes/story/B3B4';
import {LinkBubble} from '../scenes/story/B10B11';
import type {Who} from '../characters/Character';
import type {InsertKind} from './timeline';

/* A generic chat app, sketched — no real brand. */
const ChatHeader: React.FC<{sx: number; sy: number; sw: number; who: Who; seed: number}> = ({sx, sy, sw, who, seed}) => (
  <g>
    <Fill d={rectD(sx, sy, sw, 86, 0)} color={C.pine} op={0.85} seed={seed} f="wcS" knock={C.cream} o={{strokeWidth: 1.6}} />
    <Avatar who={who} x={sx + 50} y={sy + 43} r={28} seed={seed + 1} />
    <R s={L(sx + 96, sy + 36, sx + 210, sy + 36)} seed={seed + 2} o={{...THIN, stroke: C.cream, strokeWidth: 5}} />
    <R s={L(sx + 96, sy + 58, sx + 170, sy + 58)} seed={seed + 3} o={{...THIN, stroke: C.cream, strokeWidth: 2.4}} />
  </g>
);

const ChatLines: React.FC<{sx: number; sy: number; sw: number; seed: number; n?: number}> = ({sx, sy, sw, seed, n = 2}) => (
  <g>
    {Array.from({length: n}).map((_, i) => {
      const right = i % 2 === 1;
      const w = sw * (0.5 + 0.12 * (i % 3));
      const x = right ? sx + sw - w - 18 : sx + 18;
      return (
        <g key={i}>
          <Fill d={rectD(x, sy + 110 + i * 84, w, 60, 18)} color={right ? C.sage : C.cream} op={0.7} seed={seed + i * 2} f="wcS" knock={C.cream} o={{strokeWidth: 1.6}} />
          <R s={L(x + 18, sy + 140 + i * 84, x + w - 30, sy + 140 + i * 84)} seed={seed + i * 2 + 1} o={THIN} opacity={0.5} />
        </g>
      );
    })}
  </g>
);

const LinkCard: React.FC<{x: number; y: number; w: number; seed: number; mine?: boolean}> = ({x, y, w, seed, mine}) => (
  <g>
    <Fill d={rectD(x, y, w, 150, 18)} color={mine ? C.sage : C.cream} op={0.75} seed={seed} f="wcS" knock={C.cream} o={{strokeWidth: 2}} />
    <AppMark x={x + 50} y={y + 52} s={1.1} seed={seed + 1} />
    <HText x={x + 90} y={y + 64} size={34}>Sajha Kaam</HText>
    <R s={L(x + 24, y + 112, x + w - 40, y + 112)} seed={seed + 2} o={{...THIN, stroke: C.crimson, strokeWidth: 3}} />
  </g>
);

const InviteInsert: React.FC = () => {
  const f = useCurrentFrame();
  const send = ramp(f, 26, 34);
  const flight = ramp(f, 34, 74, E.inOut);
  const landed = f >= 74;
  const buzz = f > 74 && f < 92 ? hn(f) * 5 : 0;
  return (
    <Shot>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.22} f="wcL" />
      <BigPhone x={260} y={150} w={400} h={780} seed={2000} rot={-4}>
        {(sx, sy, sw) => (
          <g>
            <ChatHeader sx={sx} sy={sy} sw={sw} who="emma" seed={2001} />
            <ChatLines sx={sx} sy={sy} sw={sw} seed={2005} n={2} />
            <g opacity={ramp(f, 6, 14)} transform={`translate(0 ${(1 - send) * 0})`}>
              <LinkCard x={sx + sw - 320} y={sy + 300} w={300} seed={2010} mine />
            </g>
          </g>
        )}
      </BigPhone>
      <HoldingHand x={262} y={700} s={1.5} skin={SKIN.rajan} seed={2015} />
      <g transform={`translate(${buzz} 0)`}>
        <BigPhone x={1260} y={150} w={400} h={780} seed={2020} rot={4}>
          {(sx, sy, sw) => (
            <g>
              <ChatHeader sx={sx} sy={sy} sw={sw} who="rajan" seed={2021} />
              <ChatLines sx={sx} sy={sy} sw={sw} seed={2025} n={2} />
              {landed ? <LinkCard x={sx + 18} y={sy + 300} w={300} seed={2030} /> : null}
            </g>
          )}
        </BigPhone>
      </g>
      <HoldingHand x={1658} y={700} s={1.5} skin={SKIN.emma} seed={2035} flip />
      {flight > 0 && flight < 1 ? (
        <LinkBubble x={lerp(560, 1400, flight)} y={lerp(520, 520, flight) - Math.sin(flight * Math.PI) * 300} s={1.6} rot={Math.sin(flight * Math.PI * 2) * 10} seed={2040} />
      ) : null}
      {f > 74 && f < 100 ? <R s={P('M 1700 260 L 1740 240 M 1704 300 L 1750 300 M 1700 340 L 1740 360')} seed={2041} o={THIN} opacity={1 - (f - 74) / 26} /> : null}
      <Cap><HText x={960} y={1030} size={60} anchor="middle" reveal={ramp(f, 40, 64)}>
        Shared in a chat
      </HText></Cap>
    </Shot>
  );
};

const OpenInsert: React.FC = () => {
  const f = useCurrentFrame();
  const tapY = kf(f, [[6, 1100], [20, 520, E.out], [28, 530], [44, 1100, E.in]]);
  const app = ramp(f, 28, 80, E.soft);
  return (
    <Shot>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.22} f="wcL" />
      <BigPhone x={760} y={120} w={420} h={820} seed={2100} glow={app}>
        {(sx, sy, sw, sh) => (
          <g>
            <g opacity={1 - ramp(f, 28, 36)}>
              <ChatHeader sx={sx} sy={sy} sw={sw} who="rajan" seed={2101} />
              <ChatLines sx={sx} sy={sy} sw={sw} seed={2105} n={2} />
              <LinkCard x={sx + 18} y={sy + 300} w={320} seed={2110} />
            </g>
            <AppHome sx={sx} sy={sy} sw={sw} sh={sh} p={app} seed={2115} />
          </g>
        )}
      </BigPhone>
      <HoldingHand x={762} y={720} s={1.6} skin={SKIN.emma} seed={2120} />
      <g transform={`translate(980 ${tapY}) rotate(-10)`}>
        <path d="M -30 0 C -30 -44 30 -44 30 0 L 34 300 L -34 300 Z" fill={SKIN.emma} stroke={C.ink} strokeWidth={3} />
      </g>
      {f > 18 && f < 30 ? <circle cx={980} cy={520} r={44} fill="none" stroke={C.marigold} strokeWidth={6} /> : null}
      <Cap><HText x={1500} y={540} size={60} anchor="middle" reveal={ramp(f, 30, 54)}>
        Emma taps it
      </HText></Cap>
    </Shot>
  );
};

const Banner: React.FC<{sx: number; sy: number; sw: number; t: number; seed: number}> = ({sx, sy, sw, t, seed}) => {
  if (t <= 0) return null;
  const y = sy + kf(t, [[0, -120], [0.7, 26, E.out], [1, 16]]);
  return (
    <g>
      <Fill d={rectD(sx + 14, y, sw - 28, 110, 22)} color={C.cream} op={0.85} seed={seed} f="wcS" knock={C.cream} o={{strokeWidth: 2.4}} />
      <AppMark x={sx + 62} y={y + 55} s={1.1} seed={seed + 1} />
      <R s={L(sx + 104, y + 40, sx + sw - 60, y + 40)} seed={seed + 2} o={{...THIN, strokeWidth: 5}} />
      <R s={L(sx + 104, y + 72, sx + sw - 110, y + 72)} seed={seed + 3} o={THIN} opacity={0.6} />
    </g>
  );
};

const NotifyInsert: React.FC = () => {
  const f = useCurrentFrame();
  const buzz = (s: number) => (f > s && f < s + 16 ? hn(f + s) * 5 : 0);
  return (
    <Shot>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.crimsonTint} op={0.16} f="wcL" />
      {[
        {x: 420, who: 'sita' as Who, s: 16, seed: 2200, skin: SKIN.sita, ax: 220},
        {x: 1100, who: 'bikash' as Who, s: 34, seed: 2240, skin: SKIN.bikash, ax: 1700},
      ].map((p) => (
        <g key={p.who}>
          <g transform={`translate(${buzz(p.s)} 0)`}>
            <BigPhone x={p.x} y={150} w={400} h={780} seed={p.seed}>
              {(sx, sy, sw) => (
                <g>
                  {[0, 1, 2, 3].map((k) => (
                    <R key={k} s={L(sx + 30, sy + 260 + k * 60, sx + sw - 50 - (k % 2) * 60, sy + 260 + k * 60)} seed={p.seed + 5 + k} o={THIN} opacity={0.35} />
                  ))}
                  <Banner sx={sx} sy={sy} sw={sw} t={ramp(f, p.s, p.s + 16)} seed={p.seed + 10} />
                </g>
              )}
            </BigPhone>
          </g>
          <Avatar who={p.who} x={p.ax} y={540} r={120} expr={f > p.s + 12 ? 'surprised' : 'neutral'} seed={p.seed + 20} />
        </g>
      ))}
      <Cap><HText x={960} y={1040} size={60} anchor="middle" reveal={ramp(f, 50, 74)}>
        A job for your skills
      </HText></Cap>
    </Shot>
  );
};

const ReleaseInsert: React.FC = () => {
  const f = useCurrentFrame();
  const lock = 1 - ramp(f, 24, 32, E.out);
  const open = ramp(f, 32, 46, E.out);
  const targets: {who: Who | 'app'; x: number; y: number}[] = [
    {who: 'sita', x: 1480, y: 230},
    {who: 'bikash', x: 1700, y: 520},
    {who: 'rajan', x: 1480, y: 810},
    {who: 'app', x: 250, y: 300},
  ];
  return (
    <Shot>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.marigoldTint} op={0.22} f="wcL" />
      <Bloom cx={860} cy={620} rx={300} ry={300} color={C.marigoldTint} op={0.5 * open} />
      <Jar x={860} y={950} seed={2300} lid={1} coins={Math.max(0, 12 - Math.floor(ramp(f, 44, 120, E.linear) * 12))} lock={lock} open={open} />
      {targets.map((t, i) =>
        t.who === 'app' ? (
          <g key={i} transform={`translate(${t.x} ${t.y}) scale(2.4)`}>
            <AppMark x={0} y={0} seed={2310} />
          </g>
        ) : (
          <Avatar key={i} who={t.who} x={t.x} y={t.y} r={90} expr={f > 90 ? 'joy' : 'happy'} seed={2311 + i} />
        ),
      )}
      {Array.from({length: 16}).map((_, i) => {
        const tg = targets[i % 4];
        const s = 46 + i * 4;
        const t = ramp(f, s, s + 34, E.soft);
        if (t <= 0 || t >= 1) return null;
        const x = lerp(860, tg.x, t);
        const y = lerp(600, tg.y, t) - Math.sin(t * Math.PI) * 160;
        return <Coin key={i} x={x} y={y} s={1.4} seed={2320 + i} spin={f / 3} />;
      })}
      <Cap><HText x={860} y={150} size={64} anchor="middle" reveal={ramp(f, 8, 30)}>
        The money moves
      </HText></Cap>
    </Shot>
  );
};

const SmsInsert: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Shot>
      <Wash d={rectD(-100, -100, 2200, 1300)} color={C.sage} op={0.2} f="wcL" />
      {[
        {x: 420, who: 'sita' as Who, s: 14, seed: 2400, col: C.pine, ax: 220, skin: SKIN.sita},
        {x: 1100, who: 'bikash' as Who, s: 34, seed: 2440, col: C.crimson, ax: 1700, skin: SKIN.bikash},
      ].map((p) => {
        const t = ramp(f, p.s, p.s + 14);
        return (
          <g key={p.who}>
            <BigPhone x={p.x} y={150} w={400} h={780} seed={p.seed}>
              {(sx, sy, sw) => (
                <g>
                  <Fill d={rectD(sx, sy, sw, 80)} color={p.col} op={0.7} seed={p.seed + 1} f="wcS" knock={C.cream} o={{strokeWidth: 1.6}} />
                  <HText x={sx + sw / 2} y={sy + 54} size={36} anchor="middle" color={C.cream}>
                    Wallet
                  </HText>
                  <g opacity={t} transform={`translate(0 ${(1 - t) * 30})`}>
                    <Fill d={rectD(sx + 18, sy + 120, sw - 60, 170, 22)} color={C.cream} op={0.8} seed={p.seed + 2} f="wcS" knock={C.cream} o={{strokeWidth: 2}} />
                    <HText x={sx + 40} y={sy + 176} size={36}>Money received</HText>
                    <HText x={sx + 40} y={sy + 232} size={30} color={C.inkSoft}>from Sajha Kaam</HText>
                  </g>
                </g>
              )}
            </BigPhone>
            <Avatar who={p.who} x={p.ax} y={540} r={120} expr={f > p.s + 12 ? 'joy' : 'hopeful'} seed={p.seed + 20} />
          </g>
        );
      })}
      <Cap><HText x={960} y={1040} size={60} anchor="middle" reveal={ramp(f, 50, 74)}>
        Paid to their wallets
      </HText></Cap>
    </Shot>
  );
};

export const INSERTS: Record<InsertKind, React.FC> = {
  invite: InviteInsert,
  open: OpenInsert,
  notify: NotifyInsert,
  release: ReleaseInsert,
  sms: SmsInsert,
};

export {ellD};
