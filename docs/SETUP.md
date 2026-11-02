# One-time setup

You (Alex) do these once. Each step names where the value goes.

## 1. New Base44 app
1. In Base44, create a new app called **SFRMR v2**. The old app stays as it is.
2. Add the entities in `backend/entities/` and the functions in `backend/functions/` to it. Base44's GitHub sync or its builder can import them.
3. Under **Auth**, turn on **email/password** and **Sign in with Apple**. Turn the others off; Apple plus email is the cleanest lineup for App Review.
4. Copy the **App ID** and the app's public URL into `EXPO_PUBLIC_BASE44_APP_ID` and `EXPO_PUBLIC_BASE44_APP_URL`.
5. Set the secret `REVENUECAT_WEBHOOK_AUTH` to a long random string. You'll paste the same value into RevenueCat in step 3.
6. Recreate the `coach_planner` agent from `backend/agents/coach_planner.jsonc`.

> **Spike to confirm first:** Sign in with Apple uses Base44's hosted login and expects to be sent back to `sfrmr://auth?access_token=…`. If Base44 rejects that custom-scheme redirect, we add a small `https` callback page on the Base44 app that forwards to the app. This is a code change on our side, not yours.

## 2. App Store Connect
1. Use the existing app record for bundle id `com.suffermore.sfrmr`. v2 ships as an update to it.
2. **Subscriptions:** create a group called "SFRMR Membership" with a monthly product at $14.99, and an annual product if you want one.
3. **Introductory offer:** free trial, 2 weeks, on each product.
4. Sign the **Paid Apps Agreement** and fill in your banking and tax info. Purchases won't load in the app until this is done.
5. Create an **App-Specific Shared Secret** and an **In-App Purchase key** for RevenueCat.

## 3. RevenueCat
1. Create a project and add an iOS app with bundle id `com.suffermore.sfrmr`. Paste in the shared secret and the IAP key from step 2.
2. Create the **entitlement** `premium` and attach both products to it.
3. Create the **offering** `default` with packages Monthly (and Annual), and mark it current.
4. **Integrations → Webhooks:** set the URL to the Base44 `revenueCatWebhook` function URL, and set the Authorization header to the same value as `REVENUECAT_WEBHOOK_AUTH`.
5. Copy the Apple **public SDK key** (starts with `appl_`) into `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.

## 4. Existing Stripe members
Each active Stripe member keeps access until their paid period ends. For each one, set these fields on their User in the new Base44 app: `subscription_status: active`, `subscription_source: stripe_legacy`, `access_until: <their next billing date>`. Then cancel their Stripe subscription with "at period end" so they aren't charged again. When `access_until` passes, the app shows them the Apple paywall.

## 5. EAS (cloud builds — no Xcode needed)
```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:create   # add the three EXPO_PUBLIC_* values for each environment
npx eas-cli@latest build --profile development --platform ios
```
Install the development build on your iPhone from the link EAS gives you, then run `npx expo start` and scan the QR code. For TestFlight, use `build --profile production` and then `eas submit`.

Test purchases with a **Sandbox Apple ID** (App Store Connect → Users and Access → Sandbox). Sandbox purchases are never charged.
