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

// Two faces from one foundry (Ek Type, Mumbai), both drawn for Devanagari *and* Latin, so a mixed
// नेपाली/English screen reads as one voice:
//   Anek Devanagari: semi-condensed display face for titles and money.
//   Mukta: humanist UI/body face, used by major Indian news sites for their Devanagari editions.
export const fonts = {
  display: { semibold: 'AnekDevanagari_600SemiBold', bold: 'AnekDevanagari_700Bold' },
  body: { regular: 'Mukta_400Regular', medium: 'Mukta_500Medium', semibold: 'Mukta_600SemiBold' },
};

type Spec = { fontSize: number; family: string; lh: number; track?: number };
export const typeScale: Record<string, Spec> = {
  display: { fontSize: 34, family: fonts.display.bold, lh: 1.1, track: -0.5 },
  h1: { fontSize: 28, family: fonts.display.bold, lh: 1.15, track: -0.3 },
  h2: { fontSize: 21, family: fonts.display.semibold, lh: 1.2 },
  money: { fontSize: 24, family: fonts.display.bold, lh: 1.1 },
  h3: { fontSize: 17, family: fonts.body.semibold, lh: 1.35 },
  body: { fontSize: 16, family: fonts.body.regular, lh: 1.45 },
  small: { fontSize: 14, family: fonts.body.regular, lh: 1.4 },
  label: { fontSize: 13, family: fonts.body.medium, lh: 1.35 },
};

export type TypeVariant = 'display' | 'h1' | 'h2' | 'money' | 'h3' | 'body' | 'small' | 'label';
