import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {TransitionPresentation, TransitionPresentationComponentProps} from '@remotion/transitions';
import {BoilCtx, R, Rc} from './rough';
import {C, HAND} from './theme';
import {E, clamp01} from './anim';
import {GrainOver} from './paint';

type PanelProps = {from: string; to: string};

const SC = 0.72;

/** Drawn storyboard panel border + shot number, in screen space. */
const PanelFrame: React.FC<{tx: number; sc: number; label: string; draw: number; seed: number}> = ({tx, sc, label, draw, seed}) => {
  const f = useCurrentFrame();
  const w = 1920 * sc;
  const h = 1080 * sc;
  const x = 960 + tx - w / 2;
  const y = 540 - h / 2;
  return (
    <BoilCtx.Provider value={Math.floor(f / 4) % 3}>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
        <R s={Rc(x - 6, y - 6, w + 12, h + 12)} seed={seed} o={{strokeWidth: 4, roughness: 1.1}} draw={draw} />
        <g opacity={clamp01(draw * 2 - 0.6)}>
          <text x={x} y={y - 22} fontFamily={HAND} fontSize={40} fontWeight={700} fill={C.ink}>
            {label}
          </text>
          <text x={x + w} y={y + h + 52} fontFamily={HAND} fontSize={30} fill={C.inkSoft} textAnchor="end">
            {'→ cut'}
          </text>
        </g>
      </svg>
    </BoilCtx.Provider>
  );
};

const PanelSlide: React.FC<TransitionPresentationComponentProps<PanelProps>> = ({children, presentationDirection, presentationProgress: p, passedProps}) => {
  const exiting = presentationDirection === 'exiting';
  let sc: number;
  let tx: number;
  if (exiting) {
    sc = 1 - (1 - SC) * E.inOut(clamp01(p / 0.35));
    tx = -1500 * E.inOut(clamp01((p - 0.35) / 0.4));
  } else {
    sc = SC + (1 - SC) * E.inOut(clamp01((p - 0.75) / 0.25));
    tx = 1500 * (1 - E.inOut(clamp01((p - 0.35) / 0.4)));
  }
  const draw = exiting ? clamp01(p / 0.3) : 1 - clamp01((p - 0.78) / 0.2);
  return (
    <AbsoluteFill>
      {!exiting ? null : (
        <AbsoluteFill style={{backgroundColor: C.paper}}>
          {/* storyboard sheet behind the panels */}
          <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
            {[0, 1, 2].map((i) => (
              <line key={i} x1={0} x2={1920} y1={1000 - i * 6} y2={1000 - i * 6} stroke={C.inkSoft} strokeOpacity={0.08} />
            ))}
          </svg>
          <GrainOver />
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          transform: `translateX(${tx}px) scale(${sc})`,
          boxShadow: sc < 0.99 ? '0 18px 40px rgba(60,30,20,0.18)' : undefined,
          overflow: 'hidden',
        }}
      >
        {children}
      </AbsoluteFill>
      {sc < 0.995 ? <PanelFrame tx={tx} sc={sc} label={exiting ? passedProps.from : passedProps.to} draw={draw} seed={exiting ? 11 : 23} /> : null}
    </AbsoluteFill>
  );
};

export const panelSlide = (props: PanelProps): TransitionPresentation<PanelProps> => ({component: PanelSlide, props});

/** Page turn: the next sheet turns over from the right, hinged on the left edge, and lands on the stack. */
const PageFlip: React.FC<TransitionPresentationComponentProps<Record<string, never>>> = ({children, presentationDirection, presentationProgress: p}) => {
  if (presentationDirection === 'exiting') {
    return (
      <AbsoluteFill>
        {children}
        <AbsoluteFill style={{background: `linear-gradient(90deg, rgba(40,20,10,${0.22 * Math.sin(p * Math.PI)}) 0%, rgba(0,0,0,0) 60%)`}} />
      </AbsoluteFill>
    );
  }
  const a = 178 * (1 - E.inOut(p));
  if (a > 90) return null; // the page is still face-down: nothing of the new sheet shows yet
  return (
    <AbsoluteFill style={{perspective: 2600}}>
      <AbsoluteFill
        style={{
          transformOrigin: '0% 50%',
          transform: `rotateY(${a}deg)`,
          backfaceVisibility: 'hidden',
          opacity: a > 90 ? 0 : 1,
          overflow: 'hidden',
          boxShadow: `${-30 * Math.sin(p * Math.PI)}px 0 60px rgba(60,30,20,${0.35 * Math.sin(p * Math.PI)})`,
        }}
      >
        {children}
        <AbsoluteFill style={{background: `linear-gradient(270deg, rgba(60,30,20,${0.4 * Math.sin(p * Math.PI)}) 0%, rgba(0,0,0,0) 50%)`}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const pageFlip = (): TransitionPresentation<Record<string, never>> => ({component: PageFlip, props: {}});
