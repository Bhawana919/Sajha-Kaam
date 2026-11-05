import {Easing, interpolate} from 'remotion';

export type EaseFn = (t: number) => number;

// Hand-timed curves: slow in / slow out with a little personality.
export const E = {
  inOut: Easing.bezier(0.45, 0, 0.22, 1),
  out: Easing.bezier(0.16, 0.8, 0.3, 1),
  in: Easing.bezier(0.6, 0, 0.85, 0.35),
  back: Easing.bezier(0.3, 1.45, 0.55, 1),
  soft: Easing.bezier(0.33, 0, 0.3, 1),
  linear: (t: number) => t,
};

/** 0..1 ramp between frames a and b. */
export const ramp = (f: number, a: number, b: number, ease: EaseFn = E.inOut) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

/** Keyframes: [[frame, value, easeIntoThisKey?], ...] — holds before the first and after the last key. */
export const kf = (f: number, keys: [number, number, EaseFn?][]) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1, e] = keys[i];
    const [f0, v0] = keys[i - 1];
    if (f <= f1) {
      const t = f1 === f0 ? 1 : (e ?? E.inOut)((f - f0) / (f1 - f0));
      return v0 + (v1 - v0) * t;
    }
  }
  return keys[keys.length - 1][1];
};

/** Anticipation -> action -> overshoot -> settle, from `from` to `to`, starting at frame a, lasting d frames. */
export const act = (f: number, a: number, d: number, from: number, to: number, antic = 0.12, over = 0.08) => {
  const span = to - from;
  return kf(f, [
    [a, from],
    [a + d * 0.28, from - span * antic, E.soft],
    [a + d * 0.72, to + span * over, E.inOut],
    [a + d, to, E.soft],
  ]);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Deterministic hash noise in [-1, 1]. */
export const hn = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};
