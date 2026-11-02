import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '@/lib/auth';
import { EntitlementProvider, useEntitlement } from '@/lib/entitlement';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BebasNeue_400Regular, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.ink }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <EntitlementProvider>
            <StatusBar style="light" />
            {fontsLoaded ? <Gate /> : null}
          </EntitlementProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Three doors, decided in one place:
 *   signed out            → (auth)
 *   signed in, no access  → paywall
 *   member                → (app)
 */
function Gate() {
  const { status } = useAuth();
  const { ready, entitled } = useEntitlement();
  const booting = status === 'booting' || (status === 'signedIn' && !ready);

  useEffect(() => {
    if (!booting) SplashScreen.hideAsync().catch(() => {});
  }, [booting]);

  if (booting) return null;

  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.ink }, animation: 'fade' }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !entitled}>
        <Stack.Screen name="paywall" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && entitled}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
