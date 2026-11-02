import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { format, parseISO } from 'date-fns';
import { Glass, Pressable, Text } from '@/ui';
import { useAuth } from '@/lib/auth';
import { base44 } from '@/lib/base44';
import { manageSubscription, iapAvailable, restore } from '@/lib/purchases';
import { useEntitlement } from '@/lib/entitlement';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/lib/env';
import { haptic } from '@/lib/haptics';
import { color, space } from '@/theme/tokens';

const STATUS: Record<string, string> = { trial: 'Free trial', active: 'Member', grace: 'Billing issue — Apple is retrying', expired: 'Expired', none: 'Not a member' };

export default function Settings() {
  const { user, updateUser, signOut } = useAuth();
  const { refresh } = useEntitlement();
  const [busy, setBusy] = useState<string | null>(null);
  const unit = user?.weight_unit ?? 'lbs';
  const sub = user?.subscription_status ?? 'none';

  async function setUnit(u: 'lbs' | 'kg') {
    if (u === unit) return;
    haptic.tick();
    try { await updateUser({ weight_unit: u }); } catch { Alert.alert('Couldn’t save', 'Try again in a moment.'); }
  }

  async function exportData() {
    setBusy('export');
    try {
      const res: any = await base44.functions.invoke('exportMyData', {});
      await Share.share({ title: 'SFRMR data export', message: JSON.stringify(res?.data ?? res, null, 2) });
    } catch {
      Alert.alert('Export failed', 'Try again in a moment.');
    } finally { setBusy(null); }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your program, workouts, food logs, and progress. It can’t be undone.\n\nAn Apple subscription is billed by Apple — cancel it in Settings › Apple ID › Subscriptions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account', style: 'destructive',
          onPress: async () => {
            setBusy('delete');
            try {
              await base44.functions.invoke('deleteMyAccount', {});
              await signOut();
            } catch {
              setBusy(null);
              Alert.alert('Couldn’t delete', `Try again, or email ${SUPPORT_EMAIL} and we’ll do it for you.`);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: space.xl, paddingBottom: space.xxxl, gap: space.xl }}>
      <View>
        <Text variant="title">Account</Text>
        <Text tone="dim">{user?.email}</Text>
      </View>

      <Group label="Membership">
        <Row title={STATUS[sub] ?? sub} detail={user?.access_until ? `${user.will_renew === false || sub === 'trial' ? 'Access until' : 'Renews'} ${format(parseISO(user.access_until), 'MMM d, yyyy')}` : undefined} />
        {user?.subscription_source === 'stripe_legacy' ? (
          <Row title="Billed through sfrmr.app" detail="Your existing membership is honored through the date above. Renew in the app after that." />
        ) : null}
        {iapAvailable() ? <Row title="Manage subscription" onPress={() => manageSubscription()} chevron /> : null}
        {iapAvailable() ? (
          <Row
            title={busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
            onPress={async () => { setBusy('restore'); try { await restore(); await refresh(); } finally { setBusy(null); } }}
          />
        ) : null}
      </Group>

      <Group label="Units">
        <View style={styles.segment}>
          {(['lbs', 'kg'] as const).map((u) => (
            <Pressable key={u} onPress={() => setUnit(u)} feedback="none" style={[styles.seg, unit === u && styles.segOn]} accessibilityRole="radio" accessibilityState={{ checked: unit === u }}>
              <Text variant="headline" tone={unit === u ? 'default' : 'dim'}>{u === 'lbs' ? 'Pounds' : 'Kilograms'}</Text>
            </Pressable>
          ))}
        </View>
      </Group>

      <Group label="Your data">
        <Row title={busy === 'export' ? 'Preparing…' : 'Export my data'} onPress={exportData} chevron />
        <Row title="Terms of Use" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} chevron />
        <Row title="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} chevron />
      </Group>

      <Group>
        <Row title="Sign out" onPress={signOut} />
        <Row title={busy === 'delete' ? 'Deleting…' : 'Delete account'} onPress={confirmDelete} muted />
      </Group>

      <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
        SFRMR {Constants.expoConfig?.version} · Suffer More LLC
      </Text>
    </ScrollView>
  );
}

function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      {label ? <Text variant="label" tone="dim" style={{ paddingHorizontal: 2 }}>{label}</Text> : null}
      <Glass padded={false}>{children}</Glass>
    </View>
  );
}

function Row({ title, detail, onPress, chevron, muted }: { title: string; detail?: string; onPress?: () => void; chevron?: boolean; muted?: boolean }) {
  const body = (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline" tone={muted ? 'dim' : 'default'}>{title}</Text>
        {detail ? <Text variant="caption" tone="dim">{detail}</Text> : null}
      </View>
      {chevron ? <Text tone="faint" variant="headline">›</Text> : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} scaleTo={0.99} feedback="tick">{body}</Pressable> : body;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.hairline },
  segment: { flexDirection: 'row', padding: 4, gap: 4 },
  seg: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: 'rgba(255,255,255,0.12)' },
});
