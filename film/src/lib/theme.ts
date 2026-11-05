import {loadFont as loadFigtree} from '@remotion/google-fonts/Figtree';
import {loadFont as loadBricolage} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as loadAnek} from '@remotion/google-fonts/AnekDevanagari';

/**
 * Colour grading = the app's theme (mobile/src/theme/index.ts). The film and the app are one brand.
 * Legacy keys used by the drawings (crimsonTint, marigoldTint, pineTint, sage, cream…) are mapped
 * onto the app tokens so every wash in the film is an app colour.
 */
export const T = {
  paper: '#F7F0E4',
  paperDeep: '#EDE2D1',
  white: '#FFFCF7',
  line: '#EBDFCD',
  lineStrong: '#D5C3AC',
  ink: '#25161A',
  inkSoft: '#655457',
  inkFaint: '#8F8183',
  brick: '#A8132B',
  brickDeep: '#760B1E',
  brickSoft: '#F8DCDF',
  pine: '#1C3A2E',
  pineDeep: '#132A21',
  pineSoft: '#B9D0C2',
  honey: '#E99A0C',
  honeyLight: '#F6BE3B',
  honeyDeep: '#8A5300',
  honeyWash: '#FBE7BD',
  green: '#2B7349',
  sageSoft: '#DCEADF',
  blush: '#F29CA3',
};

export const C = {
  paper: T.paper,
  paperShade: T.paperDeep,
  ink: T.ink,
  inkSoft: T.inkSoft,
  inkFaint: T.inkFaint,
  crimson: T.brick,
  crimsonDeep: T.brickDeep,
  crimsonTint: T.blush,
  crimsonSoft: T.brickSoft,
  pine: T.pine,
  pineTint: T.pineSoft,
  sage: T.sageSoft,
  green: T.green,
  marigold: T.honey,
  marigoldTint: T.honeyWash,
  honeyLight: T.honeyLight,
  honeyDeep: T.honeyDeep,
  cream: T.white,
  line: T.line,
  lineStrong: T.lineStrong,
};

export const SKIN = {
  emma: '#F1C3A0',
  rajan: '#C58A5E',
  sita: '#BC7E56',
  bikash: '#A96F47',
};

const fig = loadFigtree('normal', {weights: ['500', '600', '700', '800'], subsets: ['latin']});
const bric = loadBricolage('normal', {weights: ['600', '700', '800'], subsets: ['latin']});
const anek = loadAnek('normal', {weights: ['600', '700'], subsets: ['devanagari', 'latin']});

/** Figtree: small text people read. */
export const HAND = fig.fontFamily;
/** Bricolage Grotesque: headings. */
export const DISPLAY = bric.fontFamily;
/** Anek Devanagari: Nepali. */
export const DEVA = anek.fontFamily;
