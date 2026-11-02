import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { applyToken, base44, tokenStore } from './base44';
import { env } from './env';

export type SfrmrUser = {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  subscription_status?: 'none' | 'trial' | 'active' | 'grace' | 'expired';
  subscription_source?: 'apple' | 'stripe_legacy' | 'manual';
  access_until?: string;
  will_renew?: boolean;
  weight_unit?: 'lbs' | 'kg';
  onboarded_at?: string;
  [k: string]: unknown;
};

type Status = 'booting' | 'signedOut' | 'signedIn';

type AuthApi = {
  status: Status;
  user: SfrmrUser | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  verifyCode: (email: string, code: string, password: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithApple: () => Promise<'ok' | 'cancelled'>;
  refreshUser: () => Promise<SfrmrUser | null>;
  updateUser: (patch: Partial<SfrmrUser>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('booting');
  const [user, setUser] = useState<SfrmrUser | null>(null);

  const adopt = useCallback(async (token: string) => {
    applyToken(token);
    await tokenStore.set(token);
    const me = (await base44.auth.me()) as SfrmrUser;
    setUser(me);
    setStatus('signedIn');
  }, []);

  // Boot: restore the Keychain token, then confirm it with /me.
  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStore.get();
        if (!token) return setStatus('signedOut');
        applyToken(token);
        const me = (await base44.auth.me()) as SfrmrUser;
        setUser(me);
        setStatus('signedIn');
      } catch {
        await tokenStore.clear();
        setStatus('signedOut');
      }
    })();
  }, []);

  const api = useMemo<AuthApi>(() => ({
    status,
    user,

    async signInWithEmail(email, password) {
      const res = await base44.auth.loginViaEmailPassword(email.trim(), password);
      await adopt(res.access_token);
    },

    async register(email, password) {
      await base44.auth.register({ email: email.trim(), password });
    },

    async verifyCode(email, code, password) {
      await base44.auth.verifyOtp({ email: email.trim(), otpCode: code.trim() });
      const res = await base44.auth.loginViaEmailPassword(email.trim(), password);
      await adopt(res.access_token);
    },

    async resendCode(email) {
      await base44.auth.resendOtp(email.trim());
    },

    async resetPassword(email) {
      await base44.auth.resetPasswordRequest(email.trim());
    },

    /**
     * Sign in with Apple through Base44's hosted provider flow, inside an
     * ASWebAuthenticationSession. Base44 redirects back to `from_url` with
     * ?access_token=… (the same contract its web SDK reads).
     * SPIKE: confirm Base44 accepts the sfrmr:// redirect. If it only allows
     * https, point from_url at a tiny /native-callback page on the Base44
     * app that forwards to sfrmr://auth?access_token=….
     */
    async signInWithApple() {
      const redirect = Linking.createURL('auth');
      const url =
        `${env.base44AppUrl}/api/apps/auth/apple/login` +
        `?app_id=${encodeURIComponent(env.base44AppId)}` +
        `&from_url=${encodeURIComponent(redirect)}`;
      const result = await WebBrowser.openAuthSessionAsync(url, redirect, { preferEphemeralSession: true });
      if (result.type !== 'success') return 'cancelled';
      const token = Linking.parse(result.url).queryParams?.access_token;
      if (typeof token !== 'string' || !token) throw new Error('Sign in with Apple did not return a session.');
      await adopt(token);
      return 'ok';
    },

    async refreshUser() {
      try {
        const me = (await base44.auth.me()) as SfrmrUser;
        setUser(me);
        return me;
      } catch {
        return null;
      }
    },

    async updateUser(patch) {
      const next = (await base44.auth.updateMe(patch)) as SfrmrUser;
      setUser((u) => ({ ...(u as SfrmrUser), ...patch, ...(next ?? {}) }));
    },

    async signOut() {
      await tokenStore.clear();
      // logout() clears the axios header; on RN it skips the browser redirect.
      try { base44.auth.logout(); } catch {}
      setUser(null);
      setStatus('signedOut');
    },
  }), [status, user, adopt]);

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Turns SDK/axios errors into one short human line. */
export function authErrorMessage(e: unknown): string {
  const any = e as any;
  const msg = any?.response?.data?.message || any?.response?.data?.detail || any?.message;
  if (any?.response?.status === 401) return 'That email and password don’t match.';
  return typeof msg === 'string' && msg.length < 140 ? msg : 'Something went wrong. Try again.';
}
