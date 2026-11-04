// All text. Two Ek Type faces cover both scripts, so the family depends on the role (variant),
// not on the script. Devanagari gets a slightly taller line (its headline + matras need room).
// No fixed heights anywhere, so 200 % font scale never clips.
import { Children, type ReactNode } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typeScale, type TypeVariant } from '@/theme';

const DEVANAGARI = /[ऀ-ॿ]/;

function plainText(children: ReactNode): string {
  return Children.toArray(children)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
    .join('');
}

type Props = TextProps & { variant?: TypeVariant; color?: string; center?: boolean };

export function Txt({ variant = 'body', color = colors.ink, center, style, children, ...rest }: Props) {
  const spec = typeScale[variant];
  const ne = DEVANAGARI.test(plainText(children));
  const lh = spec.lh + (ne ? 0.15 : 0);
  const base: TextStyle = {
    fontFamily: spec.family,
    fontSize: spec.fontSize,
    lineHeight: Math.round(spec.fontSize * lh),
    color,
    textAlign: center ? 'center' : undefined,
    ...(spec.track && !ne ? { letterSpacing: spec.track } : null),
  };
  return (
    <Text {...rest} style={[base, style]}>
      {children}
    </Text>
  );
}
