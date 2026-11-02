import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { env } from './env';

/**
 * Apple In-App Purchase via RevenueCat.
 *
 * - One entitlement, `premium`, attached to the SFRMR Membership product(s).
 * - RevenueCat app_user_id = Base44 user id, so the webhook
 *   (backend/functions/revenueCatWebhook) maps purchases straight to the User.
 * - The device answer (CustomerInfo) unlocks the app instantly after purchase;
 *   the server answer (User.subscription_status) is the durable source and
 *   also covers grandfathered Stripe members.
 */
export const ENTITLEMENT = 'premium';

let configured = false;

export function iapAvailable() {
  return Platform.OS === 'ios' && !!env.revenueCatIosKey;
}

export async function configurePurchases(userId: string) {
  if (!iapAvailable()) return;
  if (!configured) {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: env.revenueCatIosKey, appUserID: userId });
    configured = true;
  } else {
    await Purchases.logIn(userId);
  }
}

export async function resetPurchases() {
  if (!configured) return;
  try { await Purchases.logOut(); } catch {}
}

export function hasPremium(info: CustomerInfo | null | undefined) {
  return !!info?.entitlements.active[ENTITLEMENT];
}

export async function getCustomerInfo() {
  if (!configured) return null;
  try { return await Purchases.getCustomerInfo(); } catch { return null; }
}

export function onCustomerInfo(cb: (info: CustomerInfo) => void) {
  if (!configured) return () => {};
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => { Purchases.removeCustomerInfoUpdateListener(cb); };
}

export type Plan = {
  pkg: PurchasesPackage;
  id: string;
  title: string;
  price: string;
  per: string;
  trial: string | null;
};

const PERIOD: Record<string, string> = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' };

function trialLabel(pkg: PurchasesPackage): string | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const n = intro.periodNumberOfUnits;
  const unit = PERIOD[intro.periodUnit] ?? intro.periodUnit.toLowerCase();
  if (unit === 'week' && n === 2) return '2 weeks free';
  return `${n} ${unit}${n === 1 ? '' : 's'} free`;
}

/** Plans from the current offering: monthly first, annual if configured. */
export async function getPlans(): Promise<Plan[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  const o = offerings.current;
  if (!o) return [];
  const pkgs = [o.monthly, o.annual].filter(Boolean) as PurchasesPackage[];
  const list = pkgs.length ? pkgs : o.availablePackages;
  return list.map((pkg) => ({
    pkg,
    id: pkg.identifier,
    title: pkg.packageType === 'ANNUAL' ? 'Yearly' : 'Monthly',
    price: pkg.product.priceString,
    per: pkg.packageType === 'ANNUAL' ? 'year' : 'month',
    trial: trialLabel(pkg),
  }));
}

/** Returns true when premium is active after the purchase; false if the user cancelled. */
export async function purchase(plan: Plan): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    return hasPremium(customerInfo);
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return hasPremium(info);
}

/** Opens Apple's native manage-subscription sheet. */
export async function manageSubscription() {
  if (configured) await Purchases.showManageSubscriptions();
}
