import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';

// RevenueCat → Base44: the ONLY writer of Apple subscription state.
// RevenueCat is configured with app_user_id = the Base44 user id (the app
// calls Purchases.logIn(user.id)), so every event maps straight to a User.
//
// Required secret: REVENUECAT_WEBHOOK_AUTH — the exact Authorization header
// value set in RevenueCat → Project → Integrations → Webhooks. Fails closed.

const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');

type Patch = Record<string, unknown>;

function patchFor(event: any): Patch | null {
  const until = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : undefined;
  const isTrial = event.period_type === 'TRIAL';
  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
    case 'SUBSCRIPTION_EXTENDED':
      return {
        subscription_status: isTrial ? 'trial' : 'active',
        subscription_source: 'apple',
        access_until: until,
        will_renew: true,
      };
    case 'CANCELLATION':
      // Auto-renew off (or refund). Access continues until expiration.
      return { will_renew: false, access_until: until };
    case 'BILLING_ISSUE':
      // Apple is retrying the charge; keep access during the grace period.
      return { subscription_status: 'grace' };
    case 'EXPIRATION':
      return { subscription_status: 'expired', will_renew: false };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (!WEBHOOK_AUTH || req.headers.get('authorization') !== WEBHOOK_AUTH) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const base44 = createClientFromRequest(req);
  try {
    const { event } = await req.json();
    if (!event?.app_user_id) return Response.json({ received: true });

    // Anonymous RevenueCat ids ($RCAnonymousID:...) aren't Base44 users.
    if (String(event.app_user_id).startsWith('$RCAnonymousID')) {
      return Response.json({ received: true, skipped: 'anonymous' });
    }

    const patch = patchFor(event);
    if (!patch) {
      console.log(`RevenueCat ${event.type}: no-op`);
      return Response.json({ received: true });
    }
    await base44.asServiceRole.entities.User.update(event.app_user_id, patch);
    console.log(`RevenueCat ${event.type}: user ${event.app_user_id} →`, patch);
    return Response.json({ received: true });
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
