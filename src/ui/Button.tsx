import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { color, font, HIT, radius, space } from '@/theme/tokens';
import { Pressable } from './Pressable';
import { Text } from './Text';

type Kind = 'primary' | 'ghost' | 'plain';

/** Primary = red glass, one per view. Ghost = hairline glass. Plain = text only. */
export function Button({
  title,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  icon,
  size = 'lg',
}: {
  title: string;
  onPress?: () => void;
  kind?: Kind;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  size?: 'lg' | 'md';
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      feedback={inactive ? 'none' : kind === 'primary' ? 'thud' : 'tap'}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[styles.base, size === 'md' && styles.md, kind === 'ghost' && styles.ghost, kind === 'plain' && styles.plain, inactive && { opacity: 0.5 }]}
    >
      {kind === 'primary' && (
        <>
          <LinearGradient colors={['#FF2A33', color.red, '#B0060F']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.sheen} />
        </>
      )}
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={color.text} /> : icon}
        {!loading && <Text style={[styles.label, size === 'md' && { fontSize: 15 }]}>{title}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    shadowColor: color.red,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  md: { minHeight: HIT, paddingHorizontal: space.lg },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairlineStrong,
    shadowOpacity: 0,
  },
  plain: { backgroundColor: 'transparent', shadowOpacity: 0 },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.08)' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  label: { fontFamily: font.semibold, fontSize: 17, letterSpacing: 0.2, color: color.text },
});
