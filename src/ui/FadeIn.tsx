import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ViewProps } from 'react-native';

/** Content rises in ~8px and fades — the app's single entrance motion. */
export function FadeIn({ delay = 0, ...rest }: ViewProps & { delay?: number }) {
  return <Animated.View entering={FadeInDown.duration(380).delay(delay).springify().damping(20)} {...rest} />;
}
