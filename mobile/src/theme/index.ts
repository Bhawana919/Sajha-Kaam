// Sajha Kaam design tokens, v3: colours from things made in Nepal. Flat colour, no gradients, no
// glass, no glow.
//   crimson   Dhaka cloth and lali gurans (stored as `brick`): primary action + the brand block.
//             One crimson button per screen.
//   pine      hill forest: the worker's own record (Work Record, earnings). Deep, calm, "earned".
//   marigold  sayapatri, the Tihar garland flower (stored as `honey`): small accents only.
//   paper     lokta paper: the warm cream background. Cards are a warmer white on it.
//   ink       a warm near-black (not blue-grey) for text and dark blocks.
//   green     "confirmed / done". Never decorative.
// Every text pairing meets WCAG AA (most 6:1 or more); inkFaint is for icons and inactive tabs only.
export const colors = {
  paper: '#F7F0E4', // lokta paper
  paperDeep: '#EDE2D1',
  white: '#FFFCF7',
  ink: '#25161A',
  inkSoft: '#655457',
  inkFaint: '#8F8183',
  line: '#EBDFCD',
  lineStrong: '#D5C3AC', // input borders
  brick: '#A8132B', // Dhaka crimson
  brickDeep: '#760B1E',
  brickSoft: '#F8DCDF', // text/marks on crimson only
  pine: '#1C3A2E',
  pineDeep: '#132A21',
  pineSoft: '#B9D0C2', // text on pine only
  honey: '#E99A0C', // marigold
  honeyLight: '#F6BE3B',
  honeyDeep: '#8A5300', // marigold text on light surfaces (AA)
  green: '#2B7349',
  blush: '#F29CA3', // inside the mascot only
  // Kept for older call sites; mapped onto the palette.
  sage: '#2B7349',
  sageSoft: '#DCEADF',
  clay: '#FFFCF7',
  honeyWash: '#FBE7BD',
  warnSoft: '#FBE7BD',
  warnInk: '#6B4203',
};

// 4-pt base. Tight inside a group (4-8), clear between groups (24-32).
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 18, pill: 999 };
export const border = 1;
export const touchMin = 48;
/** Phone-width column, centred on tablets and desktop browsers. */
export const contentMaxWidth = 560;

// Two scripts, four faces. Each line of text picks its face by script (Txt.tsx):
//   English: Bricolage Grotesque for headings and money (a crafted grotesque with real character,
//            set tight), Figtree for everything people read and tap (warm, open, very legible).
//   नेपाली:  Anek Devanagari for headings, Mukta for body: faces drawn for Devanagari (Ek Type,
//            Mumbai), so Nepali never falls back to a system font.
export const fonts = {
  display: { semibold: 'BricolageGrotesque_600SemiBold', bold: 'BricolageGrotesque_700Bold', heavy: 'BricolageGrotesque_800ExtraBold' },
  body: { regular: 'Figtree_400Regular', medium: 'Figtree_500Medium', semibold: 'Figtree_600SemiBold', bold: 'Figtree_700Bold' },
  deva: {
    display: { semibold: 'AnekDevanagari_600SemiBold', bold: 'AnekDevanagari_700Bold', heavy: 'AnekDevanagari_700Bold' },
    body: { regular: 'Mukta_400Regular', medium: 'Mukta_500Medium', semibold: 'Mukta_600SemiBold', bold: 'Mukta_600SemiBold' },
  },
};

type Role = 'display' | 'body';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy';
type Spec = { fontSize: number; role: Role; weight: Weight; lh: number; track?: number };

/** The type scale: few sizes, clear steps. Headings are tight and heavy; body is open. */
export const typeScale: Record<string, Spec> = {
  display: { fontSize: 36, role: 'display', weight: 'heavy', lh: 1.04, track: -1.1 },
  h1: { fontSize: 30, role: 'display', weight: 'bold', lh: 1.08, track: -0.8 },
  h2: { fontSize: 22, role: 'display', weight: 'bold', lh: 1.18, track: -0.4 },
  money: { fontSize: 26, role: 'display', weight: 'bold', lh: 1.05, track: -0.6 },
  h3: { fontSize: 17, role: 'body', weight: 'semibold', lh: 1.32, track: -0.1 },
  body: { fontSize: 16, role: 'body', weight: 'regular', lh: 1.5 },
  small: { fontSize: 14, role: 'body', weight: 'regular', lh: 1.45 },
  label: { fontSize: 13, role: 'body', weight: 'semibold', lh: 1.3, track: 0.2 },
};

/** The face for a style, in English or in Nepali. */
export function faceFor(spec: Spec, devanagari: boolean): string {
  const set = devanagari ? fonts.deva : fonts;
  const faces = set[spec.role] as Record<string, string>;
  return faces[spec.weight] ?? faces.regular ?? faces.semibold;
}

export type TypeVariant = 'display' | 'h1' | 'h2' | 'money' | 'h3' | 'body' | 'small' | 'label';
