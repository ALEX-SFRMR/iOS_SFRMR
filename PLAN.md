# SFRMR v2 — Plan

## Goal
One loop, done beautifully: open the app → it tells you today's work → you do it → it proves you're becoming that person. Bare-bones features, maximum polish.

## Decisions (locked)
- **Stack:** Expo / React Native (EAS cloud builds, iOS first, Android-ready).
- **Backend:** a NEW, slim Base44 app (old app stays untouched). Coach agent rebuilt there.
- **Payments:** Apple In-App Purchase via RevenueCat. One product: SFRMR Membership $14.99/mo, 2-week free trial (App Store intro offer). Optional annual later.
- **Stripe:** existing subscribers keep access until their paid period ends, then resubscribe via Apple. Web Stripe checkout is shut off.
- **Scope:** core loop only. Cut list confirmed.

## Tabs
1. **Today** — next queued workout, today's calorie/protein target, weekly standard status.
2. **Train** — workout logger (last-time line, rest timer, haptics, PR moments, finish screen) + program / weekly builder.
3. **Fuel** — daily targets, quick meal log with food search, body weight.
4. **Progress** — consistency weeks, streak, lifetime workouts, exercise trends, PRs (only true, computed numbers).

Plus: AI Coach (program + nutrition build conversation), short onboarding, Settings (subscription, export data, delete account).

## Carried over from suffer-more (ported, not copied blindly)
- `src/lib/progress/*` — consistency, counting, PRs, e1RM, queue, copy (pure functions)
- `src/lib/totalPlanMath.js`, `nutritionMath.js` — targets incl. target-date path
- `src/lib/coachPrompts.js`, `exerciseLibrary.js`, `planSave.js` — plan generation, muscle groups, volume phases (cut/bulk/maintain ramp)
- `docs/SFRMR_RULES.md` (voice, color, accuracy rules) and `docs/SFRMR_DESIGN.md` (obsidian glass, #E50914)

## Cut for v1
Community, LRNMR, coach marketplace / Stripe Connect / payouts, referrals, contest prep (future premium tier), Google Fit, fasting, calculators page (1RM folds into logger), template builder, AI personas, admin console, progress photos, share cards, all scheduled pushes except one optional weekly nudge.

## Slim data model (target ~10 entities)
User, TrainingProfile, Mesocycle, Workout, Exercise, ExerciseProgress, PersonalRecord, ConsistencyProfile / TrainingWeek, TotalPlan (targets), Meal, WeightLog. Subscription state on User (set by RevenueCat webhook).

## Build order
1. **Foundation** — Expo app shell, design system in native components, Sign in with Apple + email auth against Base44. *First spike: confirm Base44 SDK/auth works in React Native; fallback is calling its REST API directly.*
2. **Train + Progress** — logger and progress engine (most polish budget).
3. **Coach + Fuel** — coach build flow → weekly builder review; nutrition targets + meal log.
4. **Paywall** — RevenueCat + StoreKit, entitlement `premium`, webhook → Base44, TestFlight sandbox test.
5. **App Store** — screenshots, review notes + demo account, privacy labels, account deletion, submit.

## Status
- [x] **Phase 1 — Foundation:** Expo app with native tabs; design system (glass, buttons, type, haptics, motion); email and Apple auth against Base44 (token in Keychain); RevenueCat paywall with Apple's required disclosures, restore and manage; entitlement gate (Apple, legacy Stripe or comp); Today, Train, Fuel and Progress screens reading real data through the ported rules; Settings with units, export and in-app account deletion; slim backend schemas and the rewritten RevenueCat webhook.
- [ ] Spike: Base44 Apple sign-in redirect to `sfrmr://` (see docs/SETUP.md §1).
- [ ] Phase 2 — Workout logger and progress engine writes (engine.js port, completion screen, PR moments).
- [ ] Phase 3 — Coach build flow and weekly builder; Total Plan creation; meal logging with food search.
- [ ] Phase 4 — Sandbox purchase test end to end in TestFlight.
- [ ] Phase 5 — App Store submission.
