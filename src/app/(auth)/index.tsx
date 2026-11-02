import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { InkBackground, Button, Pressable, Text } from '@/ui';
import { authErrorMessage, useAuth } from '@/lib/auth';
import { color, font, radius, space } from '@/theme/tokens';

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { signInWithApple } = useAuth();
  const [busy, setBusy] = useState(false);

  async function apple() {
    setBusy(true);
    try {
      await signInWithApple();
    } catch (e) {
      Alert.alert('Sign in with Apple', authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <InkBackground />
      <View style={[styles.wrap, { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl }]}>
        <Animated.View entering={FadeIn.duration(700)} style={{ flex: 1, justifyContent: 'center' }}>
          <Text variant="label" tone="dim">Suffer More</Text>
          <Text style={styles.wordmark}>SFRMR</Text>
          <View style={styles.rail} />
          <Text variant="headline" style={{ marginTop: space.xl, fontSize: 22, lineHeight: 28 }}>
            Show up on your worst week.{'\n'}That’s the whole plan.
          </Text>
          <Text tone="dim" style={{ marginTop: space.md, maxWidth: 320 }}>
            Your program, your food targets, and proof you’re becoming the person who trains. Built for people with full lives.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={{ gap: space.md }}>
          {/* Apple HIG: Sign in with Apple uses Apple's white/black style, never brand red. */}
          <Pressable onPress={busy ? undefined : apple} feedback="thud" style={styles.apple} accessibilityRole="button" accessibilityLabel="Continue with Apple">
            {busy ? <ActivityIndicator color="#000" /> : (
              <>
                <Text style={styles.appleGlyph}>{'\uF8FF'}</Text>
                <Text style={styles.appleLabel}>Continue with Apple</Text>
              </>
            )}
          </Pressable>
          <Button title="Continue with email" kind="ghost" onPress={() => router.push('/(auth)/email')} />
          <Text variant="caption" tone="faint" style={{ textAlign: 'center', marginTop: space.sm }}>
            By continuing you agree to the Terms and Privacy Policy.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.xl },
  wordmark: { fontFamily: font.display, fontSize: 112, lineHeight: 104, color: color.text, marginTop: space.sm, letterSpacing: 1 },
  rail: { width: 56, height: 3, borderRadius: 2, backgroundColor: color.red, shadowColor: color.red, shadowOpacity: 0.9, shadowRadius: 10 },
  apple: {
    minHeight: 56, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  appleGlyph: { fontSize: 20, color: '#000', marginTop: -3 },
  appleLabel: { fontFamily: font.semibold, fontSize: 17, color: '#000' },
});
