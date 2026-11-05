import React from 'react';
import {AbsoluteFill, Freeze} from 'remotion';
import {BgCtx, BgMode} from '../lib/paint';
import {DISPLAY, HAND, T} from '../lib/theme';
import {S4B} from './story/B2Solution';
import {S1B} from './story/B1Problem';

const OPTIONS: [BgMode, string, string][] = [
  ['fields', 'a', 'Flat off-white + drifting colour fields'],
  ['weave', 'b', 'Faint Dhaka weave as the set (4.5%)'],
  ['cut', 'c', 'Layered cut-paper planes, soft shadows'],
  ['wash', 'd', 'Off-white + p5.brush watercolour blooms'],
];

/** One key frame (the thread from Melbourne to Nepal) on each of the four light backgrounds. */
export const BgOptions: React.FC<{shot?: 'thread' | 'cafe'}> = ({shot = 'thread'}) => {
  const Comp = shot === 'thread' ? S4B : S1B;
  const frame = shot === 'thread' ? 150 : 80;
  return (
    <AbsoluteFill style={{backgroundColor: T.ink}}>
      {OPTIONS.map(([mode, letter, label], i) => (
        <div key={mode} style={{position: 'absolute', left: (i % 2) * 960, top: Math.floor(i / 2) * 540, width: 960, height: 540, overflow: 'hidden'}}>
          <div style={{width: 1920, height: 1080, transform: 'scale(0.5)', transformOrigin: '0 0', position: 'relative'}}>
            <BgCtx.Provider value={mode}>
              <Freeze frame={frame}>
                <Comp />
              </Freeze>
            </BgCtx.Provider>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: 12,
              padding: '6px 14px',
              borderRadius: 999,
              background: T.ink,
              color: T.white,
              fontFamily: HAND,
              fontWeight: 600,
              fontSize: 22,
            }}
          >
            <span style={{fontFamily: DISPLAY, fontWeight: 800, marginRight: 8}}>{letter})</span>
            {label}
          </div>
        </div>
      ))}
      <div style={{position: 'absolute', left: 958, top: 0, width: 4, height: 1080, background: T.ink}} />
      <div style={{position: 'absolute', left: 0, top: 538, width: 1920, height: 4, background: T.ink}} />
    </AbsoluteFill>
  );
};
