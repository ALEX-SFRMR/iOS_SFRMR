import { BlurView } from 'expo-blur';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { color, radius, space } from '@/theme/tokens';

/**
 * Glass — the one material. Cards, sections, sheets.
 * Never nest Glass in Glass; use <Inset> for the inner layer.
 */
export function Glass({ style, children, strong, padded = true, ...rest }: ViewProps & { strong?: boolean; padded?: boolean }) {
  return (
    <View {...rest} style={[styles.shell, style]}>
      <BlurView intensity={strong ? 60 : 40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: strong ? 'rgba(14,15,19,0.72)' : color.glass }]} />
      {/* top highlight */}
      <View style={styles.highlight} />
      <View style={padded ? styles.pad : undefined}>{children}</View>
    </View>
  );
}

/** Tinted, no blur — rows and tiles inside a Glass panel. */
export function Inset({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.inset, style]} />;
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    borderCurve: 'continuous',
  },
  highlight: {
    position: 'absolute', top: 0, left: 16, right: 16, height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  pad: { padding: space.lg },
  inset: {
    backgroundColor: color.inset,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: space.md,
  },
});
