import { Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { spring } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

/** Press with a soft spring scale + a light haptic. The base for every tappable thing. */
export function Pressable({
  style,
  onPressIn,
  onPressOut,
  onPress,
  scaleTo = 0.97,
  feedback = 'tap',
  ...rest
}: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  feedback?: keyof typeof haptic | 'none';
}) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => { s.set(withSpring(scaleTo, spring)); onPressIn?.(e); }}
      onPressOut={(e) => { s.set(withSpring(1, spring)); onPressOut?.(e); }}
      onPress={(e) => { if (feedback !== 'none') haptic[feedback](); onPress?.(e); }}
      style={[style, anim]}
    />
  );
}
