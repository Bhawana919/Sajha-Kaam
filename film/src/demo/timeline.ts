import {staticFile} from 'remotion';
import {DEMO_VO} from '../lib/voTiming';

export type Step = {clip: string; who: string; line: string; seconds: number; pair?: boolean; chapter?: number};
export type Manifest = {steps: Step[]};
export type InsertKind = 'invite' | 'open' | 'notify' | 'release' | 'sms';
export type Plan = {
  chapterTitles?: Record<string, string>;
  chapterBefore?: Record<string, number>;
  steps?: Record<string, {line?: string; rate?: number; trimEnd?: number}>;
  defaultRate?: number;
  inserts?: {after?: string; before?: string; kind: InsertKind; seconds: number}[];
  chapterSeconds?: number;
  panFrames?: number;
};

export type PlayStep = Step & {rate: number; frames: number; key: string; ramp?: {skip: number; head: number; headOut: number; n: number}};
export type Item = (
  | {kind: 'card'; card: 'intro' | 'close'}
  | {kind: 'chapter'; n: number; title: string}
  | {kind: 'insert'; insert: InsertKind}
  | {kind: 'group'; steps: PlayStep[]}
) & {frames: number; section: number};

/** One narration section: Intro (0), chapters 1–9, Close (10). */
export type Section = {section: number; start: number; frames: number; voStart: number; voFrames: number};

export const FPS = 30;
const voF = (i: number) => Math.round((DEMO_VO[i]?.seconds ?? 0) * FPS);
const voStartF = (i: number) => Math.round(DEMO_VO.slice(0, i).reduce((a, r) => a + r.seconds, 0) * FPS);

/** Turns the manifest + editorial plan + narration timing into the ordered list of things the demo shows. */
export const buildTimeline = (m: Manifest, plan: Plan, pan: number) => {
  let ch = 1;
  const steps: PlayStep[] = m.steps.map((s) => {
    const p = plan.steps?.[s.line] ?? {};
    const rate = p.rate ?? plan.defaultRate ?? 1;
    if (s.chapter) ch = s.chapter;
    else if (plan.chapterBefore?.[s.line]) ch = plan.chapterBefore[s.line];
    const secs = Math.max(1, s.seconds - (p.trimEnd ?? 0));
    return {...s, key: s.line, chapter: ch, line: p.line ?? s.line, rate, frames: Math.max(30, Math.round((secs * FPS) / rate))};
  });
  // pair consecutive "pair" steps two at a time, never across chapters
  const groups: PlayStep[][] = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const n = steps[i + 1];
    if (s.pair && n?.pair && n.chapter === s.chapter) {
      groups.push([s, n]);
      i++;
    } else groups.push([s]);
  }
  const chFrames = Math.round((plan.chapterSeconds ?? 3) * FPS);
  const ins = (kind: InsertKind, sec: number, section: number): Item => ({kind: 'insert', insert: kind, frames: Math.round(sec * FPS), section});
  const items: Item[] = [{kind: 'card', card: 'intro', frames: Math.max(90, voF(0) + pan), section: 0}];
  let cur = 0;
  for (const g of groups) {
    const c = g[0].chapter ?? 1;
    const keys = g.map((s) => s.key);
    if (c !== cur) {
      cur = c;
      items.push({kind: 'chapter', n: c, title: plan.chapterTitles?.[String(c)] ?? `Chapter ${c}`, frames: chFrames, section: c});
    }
    for (const x of plan.inserts ?? []) if (x.before && keys.includes(x.before)) items.push(ins(x.kind, x.seconds, c));
    // + 2*pan: the first frame holds while the camera pans in, the last frame holds while it pans away
    items.push({kind: 'group', steps: g, frames: g.reduce((a, s) => a + s.frames, 0) + 2 * pan, section: c});
    for (const x of plan.inserts ?? []) if (x.after && keys.includes(x.after)) items.push(ins(x.kind, x.seconds, c));
  }
  items.push({kind: 'card', card: 'close', frames: Math.max(120, voF(DEMO_VO.length - 1) + pan), section: DEMO_VO.length - 1});

  // stretch a chapter (hold its last group) when its narration is longer than its pictures
  const secs = Array.from(new Set(items.map((i) => i.section)));
  for (const sec of secs) {
    const its = items.filter((i) => i.section === sec);
    const natural = its.reduce((a, i) => a + i.frames, 0) - (its.length - 1) * pan;
    const need = voF(sec) + pan;
    if (need > natural) {
      const last = [...its].reverse().find((i) => i.kind === 'group') ?? its[its.length - 1];
      last.frames += need - natural;
    }
  }
  // absolute section starts, for placing each narration segment
  const sections: Section[] = [];
  let t = 0;
  items.forEach((it, i) => {
    if (i > 0) t -= pan;
    const prev = sections[sections.length - 1];
    if (!prev || prev.section !== it.section) sections.push({section: it.section, start: t, frames: 0, voStart: voStartF(it.section), voFrames: voF(it.section)});
    const s = sections[sections.length - 1];
    s.frames = t + it.frames - s.start;
    t += it.frames;
  });
  return {items, sections};
};

export const totalFrames = (items: Item[], pan: number) => items.reduce((a, it) => a + it.frames, 0) - Math.max(0, items.length - 1) * pan;

export const loadDemo = async () => {
  const m: Manifest = await fetch(staticFile('demo/manifest.json')).then((r) => r.json());
  let plan: Plan = {};
  try {
    plan = await fetch(staticFile('demo-plan.json')).then((r) => (r.ok ? r.json() : {}));
  } catch {
    plan = {};
  }
  let vo = false;
  try {
    vo = (await fetch(staticFile('vo/demo.m4a'), {method: 'HEAD'})).ok;
  } catch {
    vo = false;
  }
  const pan = plan.panFrames ?? 20;
  return {...buildTimeline(m, plan, pan), pan, vo};
};
