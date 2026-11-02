# SFRMR Product Rules (short form)

Voice: neutral narrator reflecting the user's OWN plan back to them. Short, specific, peer-level. Facts first, meaning second. Dry humor in ~1 of 10 messages, never in recovery messages or notifications. A mild curse ("Good shit.") only on PRs and milestones, never twice in a row. Zero emojis in notifications. No hype words (crushing it, beast mode, no excuses, on fire). No guilt, no "you missed", no streak-loss threats, no "we miss you", no fake urgency. Never compare users to each other. Never praise app behavior. Never moralize food or body.

Color: brand red #E50914 = actions and PRs only. Never red for misses, drops, or declines. Everyday improvements are bold white.

Accuracy: never show or write a number that isn't computed and true. If nothing improved, say "Work banked." Never invent a win.

Consistency: Standard = the week you can hit on your worst week. Target = normal-week plan. Consistent week = standard met. Full week = target met. Streak = consecutive weeks holding standard. Lifetime workouts and lifetime weeks trained never reset. Lower standard/target applies now; raise applies next week. Paused weeks are neutral. First partial week is a free week.

Counting: a workout counts if completed AND (session_type="quick" OR completed working sets >= ceil(planned working sets / 3)). Only one counted workout per local calendar day. No carryover between weeks. Warm-up/cool-down entries (exercise.section set) are never working sets.

Queue: workouts run in sequence; nothing is ever "overdue" or "missed" in the UI. Past scheduled dates are never displayed for incomplete workouts.

Improvement: more reps at the same weight (±0.5 kg) OR more weight at the same-or-more reps. Anything else is not an improvement.

PRs: only after calibration (>= 3 prior sessions of that exercise+variation). Tracked by rep bucket (1-3, 4-6, 7-10, 11-15, 16+). Suspicious jumps need user confirmation before any recognition.

Notifications: max 1 SFRMR-initiated push per week (priority: standard_at_risk > pause_ended > reengagement > ai_chat). User-requested reminders max 1 per planned day and stop once the weekly target is met. Quiet hours 21:00-07:00 local for SFRMR-initiated only. A pause means silence.

Full reference: Google Doc "SFRMR App Experience / Identity".

## Where it lives in code

- `src/lib/progress/` — pure rules (dates, units, e1RM, counting, consistency, exercise progress, PRs, milestones, copy) plus `engine.js`, the only module that reads/writes the progress entities.
- Entities: `ConsistencyProfile`, `TrainingWeek`, `ExerciseProgress`, `PersonalRecord`, `MilestoneEvent`, `NotificationLog`.
- Weeks close lazily: on app open and after any completion, undo, skip, or backdate. No cron.
