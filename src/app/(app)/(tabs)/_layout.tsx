import { NativeTabs } from 'expo-router/native-tabs';
import { color } from '@/theme/tokens';

/**
 * Real iOS tab bar (Liquid Glass on iOS 26). Four tabs, nothing else.
 * Tint is white: red is reserved for the one primary action and PRs.
 */
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={color.text} iconColor={{ default: color.textFaint, selected: color.text }} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="train">
        <NativeTabs.Trigger.Icon sf="dumbbell.fill" />
        <NativeTabs.Trigger.Label>Train</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="fuel">
        <NativeTabs.Trigger.Icon sf={{ default: 'fork.knife', selected: 'fork.knife' }} />
        <NativeTabs.Trigger.Label>Fuel</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" />
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
