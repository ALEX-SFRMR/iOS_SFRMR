# SFRMR v2 — notes for Claude

Read `AGENTS.md` (Expo rules) and `PLAN.md` (scope) first. Product rules: `docs/SFRMR_RULES.md` — voice, color, accuracy. They are not optional.

## Layout
- `src/app/` — routes only (Expo Router). `_layout.tsx` is the single gate: signed out → `(auth)`, no access → `paywall`, member → `(app)`.
- `src/ui/` — the design system (Glass, Button, Text, Screen, Meter…). Use it; don't hand-roll styles in screens. Tokens in `src/theme/tokens.ts`.
- `src/core/` — pure rules ported from the v1 app (consistency, counting, PRs, queue, nutrition math). No I/O. Keep them pure.
- `src/data/` — React Query hooks; the only place screens get data.
- `src/lib/` — Base44 client + auth (token in Keychain), RevenueCat purchases, entitlement, haptics.
- `backend/` — Base44 entity schemas (`entities/*.jsonc`) and Deno functions. Field names here are the contract for `src/data`.

## Rules
- Red (`color.red`) only for the one primary action per view, the active rail, and PRs. Progress fills are white.
- Never show a number that isn't computed from real rows. Empty states say what will appear and how.
- Subscription state is written only by `backend/functions/revenueCatWebhook` (or by hand for comps). The app never writes it.
- Install packages with `npx expo install` (use `EXPO_OFFLINE=1` in sandboxes where api.expo.dev is blocked). Pin `react-dom` to the exact `react` version.
- Never create or edit `ios/` / `android/` — configure via `app.json`.
- Run `npx tsc --noEmit` and `npx eslint .` before committing.
