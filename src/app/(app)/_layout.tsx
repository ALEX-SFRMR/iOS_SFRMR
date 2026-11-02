import { Stack } from 'expo-router';
import { color } from '@/theme/tokens';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.ink } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="settings"
        options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.92], sheetCornerRadius: 28, contentStyle: { backgroundColor: color.inkRaised } }}
      />
    </Stack>
  );
}
