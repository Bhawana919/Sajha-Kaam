// The single source of timing for SajhaKaamPitch (the 5:00 live-narrated film). See PRESENTATION.md.
export const PITCH_FPS = 30;
export const PITCH_BEATS: {n: number; title: string; seconds: number; act: 1 | 2 | 3}[] = [
  {n: 1, title: 'Talent, but no way in', seconds: 15, act: 1},
  {n: 2, title: 'So they leave', seconds: 7, act: 1},
  {n: 3, title: 'The other side', seconds: 14, act: 1},
  {n: 4, title: 'Sajha Kaam', seconds: 9, act: 1},
  {n: 5, title: 'A Leader brings the client', seconds: 30, act: 2},
  {n: 6, title: 'Or the client posts it', seconds: 23, act: 2},
  {n: 7, title: 'The Leader builds the team', seconds: 24, act: 2},
  {n: 8, title: 'Guided, not done for them', seconds: 33, act: 2},
  {n: 9, title: 'First pay', seconds: 35, act: 2},
  {n: 10, title: 'Proof, and the journey', seconds: 22, act: 2},
  {n: 11, title: 'From member to Leader', seconds: 23, act: 2},
  {n: 12, title: 'How it earns, how it grows', seconds: 30, act: 3},
  {n: 13, title: 'Fair by design', seconds: 17, act: 3},
  {n: 14, title: 'Opportunity comes home', seconds: 18, act: 3},
];
export const beatFramesP = (i: number) => Math.round(PITCH_BEATS[i].seconds * PITCH_FPS);
export const PITCH_FRAMES = PITCH_BEATS.reduce((a, _, i) => a + beatFramesP(i), 0); // 9000
export const pitchStarts = () => {
  let t = 0;
  return PITCH_BEATS.map((b, i) => {
    const s = t;
    t += beatFramesP(i);
    return {n: b.n, title: b.title, start_frame: s, frames: beatFramesP(i)};
  });
};
