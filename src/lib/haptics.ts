import * as Haptics from 'expo-haptics';

// One vocabulary of feel, used everywhere. Fire-and-forget: haptics must
// never block or throw into UI code.
const safe = (p: Promise<void>) => { p.catch(() => {}); };

export const haptic = {
  /** Selection changes: chips, steppers, tab-like toggles. */
  tick: () => safe(Haptics.selectionAsync()),
  /** Ordinary button press. */
  tap: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Logging a set / committing something. */
  thud: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Workout finished, week held. */
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** PR — the knuckle bump. */
  pr: () => {
    safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    setTimeout(() => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), 120);
  },
  warn: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
