import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import * as brush from 'p5.brush/standalone';

/**
 * Pre-renders a p5.brush watercolour bloom (or pencil texture) to a transparent PNG.
 * p5.brush is seeded, so the result is deterministic. Rendered with scripts/brush-assets.mjs
 * into public/brush/*.png and then used as plain images inside the film.
 */
export type BrushAssetProps = {kind: 'bloom' | 'band' | 'blot'; color: string; seed: number; w: number; h: number; opacity?: number};

export const BrushAsset: React.FC<BrushAssetProps> = ({kind, color, seed, w, h, opacity = 70}) => {
  const host = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [handle] = useState(() => delayRender('p5.brush'));
  useLayoutEffect(() => {
    if (!host.current) return;
    const canvas = brush.createCanvas(w, h, {parent: host.current});
    brush.seed(seed);
    brush.noiseSeed(seed);
    brush.clear();
    brush.noStroke();
    brush.noHatch();
    // the standalone canvas has its origin at the centre
    const cx = 0;
    const cy = 0;
    const blob = (x: number, y: number, rx: number, ry: number, n: number, jitter: number, k: number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = 1 + Math.sin(a * 3 + seed + k) * jitter + Math.cos(a * 5 + seed * 0.7 + k) * jitter * 0.6;
        pts.push([x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]);
      }
      return pts;
    };
    brush.fill(color, opacity);
    brush.fillBleed(0.35, 'out');
    brush.fillTexture(0.55, 0.6, true);
    if (kind === 'bloom') {
      brush.polygon(blob(cx, cy, w * 0.36, h * 0.34, 24, 0.12, 0));
      brush.fill(color, opacity * 0.6);
      brush.fillBleed(0.25, 'out');
      brush.polygon(blob(cx + w * 0.06, cy - h * 0.04, w * 0.22, h * 0.2, 18, 0.15, 2));
    } else if (kind === 'band') {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 16; i++) pts.push([(i / 16) * w - w / 2, h * -0.08 + Math.sin(i * 0.9 + seed) * h * 0.08]);
      for (let i = 16; i >= 0; i--) pts.push([(i / 16) * w - w / 2, h * 0.16 + Math.sin(i * 0.7 + seed * 2) * h * 0.07]);
      brush.polygon(pts);
    } else {
      brush.polygon(blob(cx, cy, w * 0.3, h * 0.3, 16, 0.2, 1));
    }
    brush.render();
    setSrc(canvas.toDataURL('image/png'));
    canvas.remove();
  }, [kind, color, seed, w, h, opacity]);
  return (
    <AbsoluteFill>
      <div ref={host} style={{position: 'absolute', opacity: 0}} />
      {src ? <img src={src} width={w} height={h} onLoad={() => continueRender(handle)} style={{position: 'absolute', left: 0, top: 0}} /> : null}
    </AbsoluteFill>
  );
};
