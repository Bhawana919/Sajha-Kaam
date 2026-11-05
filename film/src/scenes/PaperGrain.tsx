import React from 'react';
import {AbsoluteFill} from 'remotion';

/**
 * Seamless, tileable paper-grain texture (near-white with faint speckle, fibres and mottling).
 * Rendered once to public/paper-grain.png with `npm run paper`, then multiplied over every shot.
 */
export const PaperGrain: React.FC = () => (
  <AbsoluteFill style={{background: 'white'}}>
    <svg width={900} height={900} viewBox="0 0 900 900">
      <filter id="speck" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={2} seed={4} stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.3  0 0 0 5 -2.9" />
      </filter>
      <filter id="tooth" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves={3} seed={13} stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.47  0 0 0 0 0.4  0 0 0 1.6 -0.62" />
      </filter>
      <filter id="fibre" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="turbulence" baseFrequency="0.012 0.05" numOctaves={2} seed={21} stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 -14 1" />
      </filter>
      <filter id="mottle" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.0045" numOctaves={3} seed={9} stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.8  0 0 0 0 0.68  0 0 0 0 0.52  0 0 0 2 -0.75" />
      </filter>
      <rect width="900" height="900" fill="white" />
      <rect width="900" height="900" filter="url(#mottle)" opacity={0.22} />
      <rect width="900" height="900" filter="url(#tooth)" opacity={0.28} />
      <rect width="900" height="900" filter="url(#fibre)" opacity={0.12} />
      <rect width="900" height="900" filter="url(#speck)" opacity={0.5} />
    </svg>
  </AbsoluteFill>
);
