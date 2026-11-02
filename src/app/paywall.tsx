import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Glass, InkBackground, Pressable, Text } from '@/ui';
import { useAuth } from '@/lib/auth';
import { useEntitlement } from '@/lib/entitlement';
import { getPlans, iapAvailable, purchase, restore, type Plan } from '@/lib/purchases';
import { PRIVACY_URL, TERMS_URL } from '@/lib/env';
import { haptic } from '@/lib/haptics';
import { color, radius, space } from '@/theme/tokens';

const POINTS = [
  ['A program built for your real week', 'Your coach builds it around the days you actually have — then holds you to the standard, not perfection.'],
  ['Every set remembers last time', 'Beat it by one rep or a little weight. That’s progress, and you’ll see it.'],
  ['Food targets that fit your goal', 'Calories and protein set from your goal and date. Log fast, move on.'],
  ['Proof you’re changing', 'Weeks held, lifetime workouts, real PRs. Nothing invented, nothing reset.'],
] as const;

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { refresh, markPurchased } = useEntitlement();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  useEffect(() => {
    getPlans()
      .then((p) => { setPlans(p); setSelected(p[0]?.id ?? null); })
      .catch(() => setPlans([]));
  }, []);

  const plan = plans?.find((p) => p.id === selected) ?? null;

  async function buy() {
    if (!plan) return;
    setBusy('buy');
    try {
      const ok = await purchase(plan);
      if (ok) { haptic.success(); markPurchased(); refresh(); }
    } catch (e: any) {
      Alert.alert('Purchase didn’t go through', e?.message ?? 'Try again in a moment.');
    } finally { setBusy(null); }
  }

  async function doRestore() {
    setBusy('restore');
    try {
      const ok = await restore();
      if (ok) { haptic.success(); markPurchased(); refresh(); }
      else {
        await refresh();
        Alert.alert('Nothing to restore', 'No active SFRMR membership was found for this Apple ID.');
      }
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Try again in a moment.');
    } finally { setBusy(null); }
  }

  const cta = plan?.trial ? `Start ${plan.trial}` : 'Become a member';

  return (
    <View style={{ flex: 1 }}>
      <InkBackground />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.xl, gap: space.xl }}>
        <Animated.View entering={FadeInDown.duration(450)}>
          <Text variant="label" tone="dim">SFRMR Membership</Text>
          <Text variant="display" style={{ marginTop: space.sm, fontSize: 52, lineHeight: 50 }}>Become the{'\n'}one who shows up.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(450)} style={{ gap: space.lg }}>
          {POINTS.map(([h, b]) => (
            <View key={h} style={{ flexDirection: 'row', gap: space.md }}>
              <View style={styles.bullet} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="headline">{h}</Text>
                <Text tone="dim">{b}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(450)} style={{ gap: space.md }}>
          {plans === null ? (
            <ActivityIndicator color={color.text} style={{ marginVertical: space.xl }} />
          ) : plans.length === 0 ? (
            <Glass>
              <Text variant="headline">Membership isn’t available right now</Text>
              <Text tone="dim" style={{ marginTop: 4 }}>
                {iapAvailable() ? 'The App Store didn’t return a price. Check your connection and try again.' : 'In-app purchase isn’t configured for this build.'}
              </Text>
            </Glass>
          ) : (
            plans.map((p) => {
              const on = p.id === selected;
              return (
                <Pressable key={p.id} onPress={() => setSelected(p.id)} feedback="tick" accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <View style={[styles.plan, on && styles.planOn]}>
                    <View style={[styles.radio, on && styles.radioOn]} />
                    <View style={{ flex: 1 }}>
                      <Text variant="headline">{p.title}</Text>
                      {p.trial ? <Text tone="dim" variant="caption">{p.trial}, then {p.price}/{p.per}</Text> : null}
                    </View>
                    <Text variant="headline">{p.price}<Text tone="dim" variant="caption">/{p.per}</Text></Text>
                  </View>
                </Pressable>
              );
            })
          )}

          <Button title={cta} onPress={buy} loading={busy === 'buy'} disabled={!plan || !!busy} />

          {/* Guideline 3.1.2 disclosure — must sit at the point of purchase. */}
          {plan ? (
            <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
              {plan.trial ? `Free for ${plan.trial.replace(' free', '')}, then ` : ''}
              {plan.price} per {plan.per}. Renews automatically until cancelled. Cancel anytime in Settings › Apple ID › Subscriptions
              {plan.trial ? ' at least 24 hours before the trial ends to avoid being charged' : ''}. Payment is charged to your Apple ID.
            </Text>
          ) : null}

          <View style={styles.links}>
            <Pressable onPress={doRestore} feedback="tick" hitSlop={8}>
              <Text tone="dim" variant="caption">{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</Text>
            </Pressable>
            <Pressable onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} feedback="tick" hitSlop={8}>
              <Text tone="dim" variant="caption">Terms of Use</Text>
            </Pressable>
            <Pressable onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} feedback="tick" hitSlop={8}>
              <Text tone="dim" variant="caption">Privacy</Text>
            </Pressable>
          </View>

          <Pressable onPress={signOut} feedback="tick" style={{ alignSelf: 'center', padding: space.sm }}>
            <Text tone="faint" variant="caption">Sign out</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: { width: 3, borderRadius: 2, backgroundColor: color.red, marginVertical: 3, shadowColor: color.red, shadowOpacity: 0.8, shadowRadius: 6 },
  plan: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: 64,
    borderRadius: radius.md, borderCurve: 'continuous', borderWidth: 1, borderColor: color.hairline, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  planOn: { borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.08)' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: color.textFaint },
  radioOn: { borderColor: color.text, borderWidth: 6 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: space.xl, marginTop: space.sm },
});
