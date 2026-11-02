import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { color, radius } from '@/theme/tokens';

/** Progress bar. Fills are WHITE — red is never used for progress. */
export function Meter({ value, max, height = 8 }: { value: number; max: number; height?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const w = useSharedValue(0);
  useEffect(() => { w.set(withSpring(pct, { damping: 22, stiffness: 140 })); }, [pct, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.get() * 100}%` }));
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <Animated.View style={[styles.fill, { borderRadius: height }, fill]} />
    </View>
  );
}

/** Week dots: one per planned session; filled = counted. Standard marked with a tick. */
export function WeekDots({ counted, target, standard }: { counted: number; target: number; standard: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: Math.max(target, 1) }).map((_, i) => (
        <View key={i} style={{ flex: 1, gap: 4 }}>
          <View style={[styles.dot, i < counted && styles.dotOn]} />
          <View style={[styles.tick, i === standard - 1 && { backgroundColor: color.textDim }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', backgroundColor: color.track, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.fill },
  dot: { height: 10, borderRadius: radius.pill, backgroundColor: color.track },
  dotOn: { backgroundColor: color.fill },
  tick: { height: 2, borderRadius: 2, alignSelf: 'center', width: 10, backgroundColor: 'transparent' },
});
