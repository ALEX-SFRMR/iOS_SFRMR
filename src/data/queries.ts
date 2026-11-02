/**
 * Read-side data hooks. Every number on screen comes from here, computed
 * from real rows by the ported pure rules in src/core — never invented.
 */
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/base44';
import { useAuth } from '@/lib/auth';
import { deviceTimezone, localDateString, weekStartFor, daysBetween } from '@/core/progress/dates';
import { evaluateWeek, computeLifetime, computeStreak } from '@/core/progress/consistency';
import { queuedWorkouts, pickCurrentWorkout } from '@/core/workout-selection';
import { projectQueue, trainingWeekdays } from '@/core/progress/queue';
import { plannedWorkingSets } from '@/core/progress/counting';
import { macrosForCalories } from '@/core/nutritionMath';

export const today = () => localDateString(new Date(), deviceTimezone());

function useUid() {
  return useAuth().user?.id ?? null;
}

export function useActiveProgram() {
  const uid = useUid();
  return useQuery({
    queryKey: ['program', uid],
    enabled: !!uid,
    queryFn: async () => {
      const [meso] = await db.Mesocycle.filter({ user_id: uid, status: 'active' }, '-created_date', 1);
      if (!meso) return null;
      const [workouts, templates] = await Promise.all([
        db.Workout.filter({ mesocycle_id: meso.id }, 'week_number', 500),
        db.WeeklyPlanTemplate.filter({ mesocycle_id: meso.id }, '-created_date', 1),
      ]);
      const queue = queuedWorkouts(workouts);
      const current = pickCurrentWorkout(workouts);
      const weekdays = trainingWeekdays(templates[0]);
      const labels = projectQueue(queue, weekdays, today());
      return { meso, workouts, queue, current, labels };
    },
  });
}

export function workoutSummary(w: any) {
  const exercises = (w?.exercises ?? []).filter((e: any) => !e.section);
  return { exercises: exercises.length, sets: plannedWorkingSets(w), names: exercises.map((e: any) => e.name) as string[] };
}

export function useConsistency() {
  const uid = useUid();
  return useQuery({
    queryKey: ['consistency', uid],
    enabled: !!uid,
    queryFn: async () => {
      const [profiles, done, weeks] = await Promise.all([
        db.ConsistencyProfile.filter({ user_id: uid }, '-created_date', 1),
        db.Workout.filter({ user_id: uid, completed: true }, '-completed_date', 1000),
        db.TrainingWeek.filter({ user_id: uid }, '-week_start_date', 60),
      ]);
      const profile = profiles[0] ?? null;
      const t = today();
      const weekStart = weekStartFor(t, profile?.week_start_day ?? 1);
      const existing = weeks.find((w: any) => w.week_start_date === weekStart);
      const week = evaluateWeek({ profile, weekStart, workouts: done, existing, today: t });
      const lifetime = computeLifetime(done, profile?.week_start_day ?? 1);
      const closedWeeks = weeks.filter((w: any) => w.week_start_date !== weekStart);
      const streak = computeStreak([week, ...closedWeeks], weekStart);
      const daysLeft = daysBetween(t, week.week_end_date) + 1;
      return { profile, week, lifetime, streak, weeks: closedWeeks, daysLeft };
    },
  });
}

export function useRecentPRs(limit = 10) {
  const uid = useUid();
  return useQuery({
    queryKey: ['prs', uid, limit],
    enabled: !!uid,
    queryFn: async () => {
      const rows = await db.PersonalRecord.filter({ user_id: uid }, '-achieved_date', limit * 2);
      return rows.filter((r: any) => !r.voided).slice(0, limit);
    },
  });
}

/** Today's targets from the active Total Plan + what's been logged today. */
export function useFuelToday() {
  const uid = useUid();
  return useQuery({
    queryKey: ['fuel', uid, today()],
    enabled: !!uid,
    queryFn: async () => {
      const t = today();
      const [plans, meals, weights] = await Promise.all([
        db.TotalPlan.filter({ user_id: uid, status: 'active' }, '-created_date', 1),
        db.Meal.filter({ user_id: uid, date: t }, 'time', 50),
        db.WeightLog.filter({ user_id: uid }, '-date', 30),
      ]);
      const plan = plans[0] ?? null;
      let target: { calories: number; protein: number } | null = null;
      if (plan?.weekly_plan?.length && plan.start_date) {
        const idx = Math.max(0, Math.floor(daysBetween(plan.start_date, t) / 7));
        const wk = plan.weekly_plan[Math.min(idx, plan.weekly_plan.length - 1)];
        const latestKg = weights[0]?.weight_kg ?? wk?.expected_weight_kg ?? plan.starting_weight_kg;
        const m = macrosForCalories({ weightKg: latestKg, calories: wk?.daily_calories });
        if (m) target = { calories: m.calories, protein: m.protein };
      }
      const eaten = meals.reduce(
        (a: any, m: any) => ({ calories: a.calories + (m.total_calories || 0), protein: a.protein + (m.total_protein_g || 0) }),
        { calories: 0, protein: 0 },
      );
      return { plan, target, eaten, meals, weights };
    },
  });
}
