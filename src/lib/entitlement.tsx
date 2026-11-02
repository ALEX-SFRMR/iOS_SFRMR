import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { CustomerInfo } from 'react-native-purchases';
import { useAuth, type SfrmrUser } from './auth';
import { configurePurchases, getCustomerInfo, hasPremium, iapAvailable, onCustomerInfo, resetPurchases } from './purchases';

/** Server-side access: Apple (via webhook), grandfathered Stripe, or comped. */
export function serverAccess(user: SfrmrUser | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const s = user.subscription_status;
  if (s !== 'trial' && s !== 'active' && s !== 'grace') return false;
  if (!user.access_until) return user.subscription_source === 'manual';
  return new Date(user.access_until).getTime() > Date.now();
}

type Ent = { ready: boolean; entitled: boolean; refresh: () => Promise<void>; markPurchased: () => void };
const Ctx = createContext<Ent>({ ready: false, entitled: false, refresh: async () => {}, markPurchased: () => {} });

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { user, status, refreshUser } = useAuth();
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [ready, setReady] = useState(false);
  const [optimistic, setOptimistic] = useState(false);

  useEffect(() => {
    let off = () => {};
    (async () => {
      if (status !== 'signedIn' || !user) {
        setInfo(null); setOptimistic(false);
        if (status === 'signedOut') { await resetPurchases(); setReady(true); }
        return;
      }
      setReady(false);
      if (iapAvailable()) {
        await configurePurchases(user.id);
        setInfo(await getCustomerInfo());
        off = onCustomerInfo(setInfo);
      }
      setReady(true);
    })();
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user?.id]);

  const refresh = useCallback(async () => {
    await refreshUser();
    if (iapAvailable()) setInfo(await getCustomerInfo());
  }, [refreshUser]);

  const entitled = optimistic || hasPremium(info) || serverAccess(user);
  return (
    <Ctx.Provider value={{ ready, entitled, refresh, markPurchased: () => setOptimistic(true) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useEntitlement = () => useContext(Ctx);
