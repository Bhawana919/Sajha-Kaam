// Sajha Kaam design tokens, v2 ("deep" palette). Flat colour, no gradients, no glass, no glow.
//
// Depth comes from a few *solid, saturated* blocks (brick, pine, ink) on a warm stone background,
// not from tinted washes. Rules:
//   brick  primary action + the brand block. One brick button per screen.
//   pine   the worker's own record (Kaam Path, Passport). Deep, calm, "earned".
//   ink    text, the dark role tile, selected states.
//   honey  small accents only: path cells, the active-tab bar, the Pahilo Kaam mark.
//   green  "confirmed / done". Never decorative.
// White cards sit on stone (#F1ECE3) so they separate without borders or shadows.
export const colors = {
  paper: '#F1ECE3', // app background (stone)
  paperDeep: '#E7E0D3',
  white: '#FFFFFF',
  ink: '#161C18',
  inkSoft: '#5D615B',
  inkFaint: '#8C8F88',
  line: '#E2DACD',
  lineStrong: '#CFC5B4', // input borders
  brick: '#B03D1E',
  brickDeep: '#852A12',
  brickSoft: '#F7D9CB', // text/marks on brick only
  pine: '#1C3A2E',
  pineDeep: '#132A21',
  pineSoft: '#B9D0C2', // text on pine only
  honey: '#F2A516',
  honeyLight: '#F7BE45',
  honeyDeep: '#9A6104', // honey-coloured text on light surfaces (AA)
  green: '#2C7A4B',
  blush: '#E98A5F', // inside the mascot only
  // Kept for older call sites; mapped onto the v2 palette.
  sage: '#2C7A4B',
  sageSoft: '#DDEBE1',
  clay: '#FFFFFF',
  honeyWash: '#FBE6B8',
  warnSoft: '#FBE6B8',
  warnInk: '#6E4503',
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
