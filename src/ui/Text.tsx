import { Text as RNText, type TextProps, StyleSheet } from 'react-native';
import { color, font } from '@/theme/tokens';

type Variant = 'display' | 'title' | 'headline' | 'body' | 'label' | 'caption' | 'number';
type Tone = 'default' | 'dim' | 'faint' | 'red';

export function Text({
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: TextProps & { variant?: Variant; tone?: Tone }) {
  return <RNText {...rest} style={[styles[variant], tones[tone], style]} />;
}

const tones = StyleSheet.create({
  default: { color: color.text },
  dim: { color: color.textDim },
  faint: { color: color.textFaint },
  red: { color: color.red },
});

const styles = StyleSheet.create({
  // Big condensed brand type: screen titles, hero numbers.
  display: { fontFamily: font.display, fontSize: 44, lineHeight: 44, letterSpacing: 0.5 },
  title: { fontFamily: font.display, fontSize: 30, lineHeight: 32, letterSpacing: 0.4 },
  headline: { fontFamily: font.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
  // Small caps-style section labels.
  label: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  // Tabular figures so numbers don't jitter while they change.
  number: { fontFamily: font.display, fontSize: 40, lineHeight: 42, fontVariant: ['tabular-nums'] },
});
