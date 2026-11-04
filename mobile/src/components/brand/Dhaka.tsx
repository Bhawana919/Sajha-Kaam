// A band of Dhaka weave: the hand-loomed cloth of the Nepali hills (the topi, the shawl). Rows of
// nested diamonds in crimson, ink, marigold and cream, repeated with an SVG pattern so it fills any
// width at no image cost. Used as the brand mark: a thin strip on every screen, a taller band on Welcome.
import { useId } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { colors } from '@/theme';

const CREAM = '#F7F0E4';

export function DhakaBand({ height = 12, style }: { height?: number; style?: ViewStyle }) {
  const id = `dhaka${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const s = height / 12; // the tile is drawn 16 x 12 and scaled to the band height
  return (
    <View style={[{ height, width: '100%', overflow: 'hidden' }, style]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={height}>
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={16 * s} height={12 * s}>
            <Rect x={0} y={0} width={16 * s} height={12 * s} fill={colors.brick} />
            {/* half diamonds at the edges join the next tile into a zigzag, as on the loom */}
            <Path d={`M0 0 L${4 * s} 0 L0 ${3 * s} Z M${16 * s} 0 L${12 * s} 0 L${16 * s} ${3 * s} Z`} fill={colors.ink} />
            <Path d={`M0 ${12 * s} L${4 * s} ${12 * s} L0 ${9 * s} Z M${16 * s} ${12 * s} L${12 * s} ${12 * s} L${16 * s} ${9 * s} Z`} fill={colors.ink} />
            <Path d={`M${8 * s} ${1 * s} L${14 * s} ${6 * s} L${8 * s} ${11 * s} L${2 * s} ${6 * s} Z`} fill={colors.ink} />
            <Path d={`M${8 * s} ${3 * s} L${11.5 * s} ${6 * s} L${8 * s} ${9 * s} L${4.5 * s} ${6 * s} Z`} fill={colors.honey} />
            <Path d={`M${8 * s} ${4.8 * s} L${9.4 * s} ${6 * s} L${8 * s} ${7.2 * s} L${6.6 * s} ${6 * s} Z`} fill={CREAM} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height={height} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
