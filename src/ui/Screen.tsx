import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, space } from '@/theme/tokens';
import { Text } from './Text';
import { FadeIn } from './FadeIn';

/** The ink field with a faint red ambient glow. Every screen sits on this. */
export function InkBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color.ink }]} />
      <LinearGradient
        colors={['rgba(229,9,20,0.22)', 'rgba(229,9,20,0.05)', 'transparent']}
        locations={[0, 0.35, 0.7]}
        start={{ x: 0.85, y: 0 }}
        end={{ x: 0.2, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/**
 * Scrolling screen with a big condensed title.
 * `eyebrow` is the small label above it (e.g. the date on Today).
 */
export function Screen({
  title,
  eyebrow,
  accessory,
  children,
  scroll = true,
  ...rest
}: ScrollViewProps & { title?: string; eyebrow?: string; accessory?: React.ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const header = (title || eyebrow) && (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text variant="label" tone="dim">{eyebrow}</Text> : null}
        {title ? <Text variant="display" style={{ marginTop: 4 }}>{title}</Text> : null}
      </View>
      {accessory}
    </View>
  );
  const body = (
    <FadeIn>
      {header}
      <View style={styles.stack}>{children}</View>
    </FadeIn>
  );
  return (
    <View style={{ flex: 1 }}>
      <InkBackground />
      {scroll ? (
        <ScrollView
          {...rest}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + 96, paddingHorizontal: space.lg }]}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: insets.top + space.lg, paddingHorizontal: space.lg }}>{body}</View>
      )}
    </View>
  );
}

export function Section({ label, children, right }: { label: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}>
        <Text variant="label" tone="dim">{label}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: space.xl, gap: space.md },
  stack: { gap: space.xl },
});
