// Usage: node scripts/stills.mjs <CompositionId> <frame> [<frame> ...]
// Bundles once, then renders each frame to out/stills/<comp>-<frame>.png
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2); // id:frame pairs
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const browserExecutable = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const browser = await openBrowser('chrome', {browserExecutable});
fs.mkdirSync(path.join(root, 'out/stills'), {recursive: true});
const comps = {};
for (const a of args) {
  const id = a.split(':')[0];
  if (!comps[id]) comps[id] = await selectComposition({serveUrl, id, puppeteerInstance: browser, browserExecutable});
}
await Promise.all(
  args.map(async (a) => {
    const [id, fr] = a.split(':');
    const composition = comps[id];
    const out = path.join(root, `out/stills/${id}-${fr}.png`);
    const t = Date.now();
    await renderStill({composition, serveUrl, output: out, frame: Number(fr), puppeteerInstance: browser, browserExecutable, overwrite: true});
    console.log(out, `${Date.now() - t}ms`);
  }),
);
await browser.close({silent: true});
