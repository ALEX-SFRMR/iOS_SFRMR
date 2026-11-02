import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Button, Field, InkBackground, Pressable, Text } from '@/ui';
import type { FieldRef } from '@/ui/Field';
import { authErrorMessage, useAuth } from '@/lib/auth';
import { color, space } from '@/theme/tokens';

type Mode = 'signIn' | 'create' | 'verify';

export default function EmailAuth() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pwRef = useRef<FieldRef>(null);

  const validEmail = /\S+@\S+\.\S+/.test(email);
  const canSubmit = mode === 'verify' ? code.trim().length >= 4 : validEmail && password.length >= (mode === 'create' ? 8 : 1);

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true); setError(null);
    try {
      if (mode === 'signIn') await auth.signInWithEmail(email, password);
      else if (mode === 'create') { await auth.register(email, password); setMode('verify'); }
      else await auth.verifyCode(email, code, password);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!validEmail) return setError('Enter your email first, then tap “Forgot password”.');
    try {
      await auth.resetPassword(email);
      Alert.alert('Check your email', 'We sent a link to reset your password.');
    } catch (e) { setError(authErrorMessage(e)); }
  }

  const title = mode === 'signIn' ? 'Welcome back' : mode === 'create' ? 'Create account' : 'Check your email';

  return (
    <View style={{ flex: 1 }}>
      <InkBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.xl, flexGrow: 1 }}
        >
          <Pressable onPress={() => (mode === 'verify' ? setMode('create') : router.back())} style={{ height: 44, justifyContent: 'center', alignSelf: 'flex-start' }} hitSlop={12}>
            <Text tone="dim" variant="headline">‹ Back</Text>
          </Pressable>

          <Animated.View key={mode} entering={FadeInDown.duration(350)} style={{ marginTop: space.xl, gap: space.sm }}>
            <Text variant="display">{title}</Text>
            {mode === 'verify' ? (
              <Text tone="dim">Enter the code we sent to {email}.</Text>
            ) : (
              <Text tone="dim">{mode === 'signIn' ? 'Pick up where you left off.' : 'Takes thirty seconds. Then we build your plan.'}</Text>
            )}
          </Animated.View>

          <Animated.View layout={LinearTransition.springify().damping(20)} style={{ marginTop: space.xxl, gap: space.lg }}>
            {mode === 'verify' ? (
              <Field
                label="Code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                maxLength={8}
                onSubmitEditing={submit}
                style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
              />
            ) : (
              <>
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => pwRef.current?.focus()}
                />
                <Field
                  ref={pwRef}
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType={mode === 'create' ? 'newPassword' : 'password'}
                  autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  placeholder={mode === 'create' ? 'At least 8 characters' : undefined}
                />
              </>
            )}

            {error ? <Text style={{ color: color.textDim }}>{error}</Text> : null}

            <Button
              title={mode === 'signIn' ? 'Sign in' : mode === 'create' ? 'Create account' : 'Verify'}
              onPress={submit}
              loading={busy}
              disabled={!canSubmit}
            />

            {mode === 'verify' ? (
              <Button title="Resend code" kind="plain" onPress={() => auth.resendCode(email).catch((e) => setError(authErrorMessage(e)))} />
            ) : (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pressable onPress={() => { setError(null); setMode(mode === 'signIn' ? 'create' : 'signIn'); }} feedback="tick" hitSlop={10}>
                  <Text tone="dim">{mode === 'signIn' ? 'New here? Create account' : 'Have an account? Sign in'}</Text>
                </Pressable>
                {mode === 'signIn' ? (
                  <Pressable onPress={forgot} feedback="tick" hitSlop={10}>
                    <Text tone="faint">Forgot password</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
