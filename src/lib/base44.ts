import { createClient } from '@base44/sdk';
import * as SecureStore from 'expo-secure-store';
import { env } from './env';

/**
 * The one Base44 client. The SDK supports React Native (it guards window /
 * document / localStorage), but it can't persist the token for us, so the
 * token lives in the iOS Keychain via SecureStore.
 */
export const base44 = createClient({
  appId: env.base44AppId,
  ...(env.base44AppUrl ? { appBaseUrl: env.base44AppUrl } : {}),
});

const TOKEN_KEY = 'sfrmr.token';

// Keychain access never throws into auth flow (it can fail on web previews or a locked device).
export const tokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY).catch(() => null),
  set: (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t).catch(() => {}),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
};

export function applyToken(token: string) {
  // saveToStorage=false: there's no localStorage on RN; we keep it in the Keychain.
  base44.auth.setToken(token, false);
}

/** Typed-enough entity access. Field names follow backend/entities/*.jsonc. */
export const db = base44.entities as Record<string, any>;
