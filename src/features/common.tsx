import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Pressable, Text } from '@/ui';
import { color } from '@/theme/tokens';

/** Header accessory: initial in a glass circle → Settings sheet. */
export function AccountButton() {
  const { user } = useAuth();
  const initial = (user?.full_name || user?.email || '?').trim().charAt(0).toUpperCase();
  return (
    <Pressable onPress={() => router.push('/settings')} feedback="tick" hitSlop={8} accessibilityLabel="Account and settings" style={styles.avatar}>
      <Text variant="headline">{initial}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={{ paddingVertical: 48 }}>
      <ActivityIndicator color={color.textDim} />
    </View>
  );
}

export function pullToRefresh(refreshing: boolean, onRefresh: () => void) {
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.textDim} />;
}

/** Big number + small label, the building block of every stat row. */
export function Stat({ value, label, unit }: { value: string | number; label: string; unit?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="number">
        {value}
        {unit ? <Text variant="caption" tone="dim">{` ${unit}`}</Text> : null}
      </Text>
      <Text variant="label" tone="dim">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: color.hairlineStrong,
  },
});
