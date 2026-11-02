// Public build-time config (EXPO_PUBLIC_* is inlined into the bundle — never put secrets here).
export const env = {
  base44AppId: process.env.EXPO_PUBLIC_BASE44_APP_ID ?? '',
  base44AppUrl: (process.env.EXPO_PUBLIC_BASE44_APP_URL ?? '').replace(/\/$/, ''),
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
};

export const TERMS_URL = 'https://sfrmr.app/TermsOfService';
export const PRIVACY_URL = 'https://sfrmr.app/PrivacyPolicy';
export const SUPPORT_EMAIL = 'support@sfrmr.com';
