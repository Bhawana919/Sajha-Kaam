// Renders the p5.brush watercolour assets used by the film into public/brush/*.png.
// Usage: node scripts/brush-assets.mjs
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const browserExecutable = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromiumOptions = {gl: 'angle'};
const T = {honeyWash: '#FBE7BD', brickSoft: '#F8DCDF', pineSoft: '#B9D0C2', sageSoft: '#DCEADF', honeyLight: '#F6BE3B', blush: '#F29CA3'};
const ASSETS = [
  ['bloom-honey', {kind: 'bloom', color: T.honeyWash, seed: 11, w: 1200, h: 800, opacity: 230}],
  ['bloom-brick', {kind: 'bloom', color: T.brickSoft, seed: 23, w: 1200, h: 800, opacity: 240}],
  ['bloom-pine', {kind: 'bloom', color: T.pineSoft, seed: 37, w: 1200, h: 800, opacity: 170}],
  ['bloom-sage', {kind: 'bloom', color: T.sageSoft, seed: 41, w: 1200, h: 800, opacity: 250}],
  ['bloom-gold', {kind: 'bloom', color: T.honeyLight, seed: 53, w: 1200, h: 800, opacity: 110}],
  ['band-pine', {kind: 'band', color: T.pineSoft, seed: 61, w: 1920, h: 600, opacity: 160}],
  ['band-honey', {kind: 'band', color: T.honeyWash, seed: 67, w: 1920, h: 600, opacity: 230}],
];

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions});
fs.mkdirSync(path.join(root, 'public/brush'), {recursive: true});
for (const [name, props] of ASSETS) {
  const composition = await selectComposition({serveUrl, id: 'BrushAsset', inputProps: props, puppeteerInstance: browser, browserExecutable, chromiumOptions});
  const out = path.join(root, `public/brush/${name}.png`);
  await renderStill({composition, serveUrl, output: out, inputProps: props, imageFormat: 'png', puppeteerInstance: browser, browserExecutable, chromiumOptions, overwrite: true});
  console.log(out);
}
await browser.close({silent: true});
