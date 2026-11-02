# SFRMR (v2)

The SFRMR iOS app, rebuilt down to one loop: open it, see today's work, do it, and see proof you're becoming the person who trains.

- **App:** Expo / React Native (SDK 58), Expo Router with native iOS tabs, built in the cloud with EAS.
- **Backend:** a new, slim Base44 app. Schemas and functions live in [`backend/`](backend/).
- **Payments:** Apple In-App Purchase through RevenueCat (`premium` entitlement).

Start with [`PLAN.md`](PLAN.md) for scope and order, and [`docs/SETUP.md`](docs/SETUP.md) for the one-time accounts and keys.

```bash
npm install
cp .env.example .env.local   # fill in Base44 + RevenueCat values
npx expo start               # needs a development build (see docs/SETUP.md)
```

Checks before every commit: `npx tsc --noEmit` and `npx eslint .`
