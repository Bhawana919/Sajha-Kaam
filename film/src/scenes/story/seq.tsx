import React from 'react';
import {Series} from 'remotion';

export type ShotList = [React.FC, number][];
export const len = (s: ShotList) => s.reduce((a, [, d]) => a + d, 0);

/** Plays a list of shots back to back (straight cuts). */
export const ShotSeq: React.FC<{shots: ShotList}> = ({shots}) => (
  <Series>
    {shots.map(([Comp, d], i) => (
      <Series.Sequence key={i} durationInFrames={d}>
        <Comp />
      </Series.Sequence>
    ))}
  </Series>
);
