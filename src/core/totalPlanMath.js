/**
 * totalPlanMath.js — deterministic multi-week Total Plan generation.
 * The weekly periodization is copied verbatim from src/pages/TotalPlan.jsx
 * (generateWeeklyPlanData + generatePlan assembly) so a coach-built plan is
 * identical to one built in the Total Plan page. The coach only supplies the
 * inputs (goal + sustainable rate); all numbers come from here.
 */
import { format, addWeeks } from "date-fns";
import { deriveAge } from "./nutritionMath";

// Verbatim from TotalPlan.jsx generateWeeklyPlanData.
export function generateWeeklyPlanData({
  totalWeeks,
  startWeightKg,
  goalWeightKg,
  isWeightLoss,
  startingLeanBodyMass,
  heightCm,
  age,
  gender,
  startingSteps,
  startingCalories,
}) {
  const startingWeightLbs = startWeightKg * 2.20462;
  const goalWeightLbs = goalWeightKg * 2.20462;
  const startingLeanMassLbs = startingLeanBodyMass * 2.20462;

  const totalChangeLbs = goalWeightLbs - startingWeightLbs;
  const weeklyTargetChangeLbs = totalChangeLbs / totalWeeks; // negative for loss

  const weeklyPlan = [];
  let currentWeightLbs = startingWeightLbs;
  let currentMuscleMassLbs = startingLeanMassLbs;

  for (let week = 1; week <= totalWeeks; week++) {
    const progressRatio = week / totalWeeks;

    let dailySteps;
    if (isWeightLoss) {
      const rawSteps = startingSteps + startingSteps * 0.5 * progressRatio;
      dailySteps = Math.round(rawSteps / 250) * 250;
    } else {
      dailySteps = Math.round(startingSteps / 250) * 250;
    }

    const currentWeightKgCalc = currentWeightLbs / 2.20462;
    let weekBmr;
    if (gender === "male") {
      weekBmr = 10 * currentWeightKgCalc + 6.25 * heightCm - 5 * age + 5;
    } else {
      weekBmr = 10 * currentWeightKgCalc + 6.25 * heightCm - 5 * age - 161;
    }

    const caloriesBurned = 0.00025 * dailySteps * currentWeightLbs;

    const dailyDeficitNeeded = -(weeklyTargetChangeLbs * 3500) / 7;
    let dailyCalories = weekBmr + caloriesBurned - dailyDeficitNeeded;
    dailyCalories = Math.round(dailyCalories / 25) * 25;
    dailyCalories = Math.max(1200, Math.min(5000, dailyCalories));

    const calorieDeficit = weekBmr + caloriesBurned - dailyCalories;
    const weeklyWeightChangeLbs = (calorieDeficit * 7) / 3500;

    currentWeightLbs = currentWeightLbs - weeklyWeightChangeLbs;

    if (isWeightLoss) {
      currentMuscleMassLbs = currentMuscleMassLbs + 0.02;
    } else {
      currentMuscleMassLbs = currentMuscleMassLbs + 0.15;
    }

    const fatMassLbs = currentWeightLbs - currentMuscleMassLbs;
    const expectedBodyFat = (fatMassLbs / currentWeightLbs) * 100;

    weeklyPlan.push({
      week_number: week,
      phase: isWeightLoss ? "CUT" : "GAIN",
      daily_calories: dailyCalories,
      daily_steps: dailySteps,
      expected_weight_kg: currentWeightLbs / 2.20462,
      expected_body_fat_percentage: Math.max(3, Math.min(50, expectedBodyFat)),
      expected_lean_mass_kg: currentMuscleMassLbs / 2.20462,
      bmr: Math.round(weekBmr * 100) / 100,
      calories_burned: Math.round(caloriesBurned * 100) / 100,
      calorie_deficit: Math.round(calorieDeficit * 100) / 100,
      weight_change_kg: Math.round((weeklyWeightChangeLbs / 2.20462) * 100) / 100,
    });
  }
  return weeklyPlan;
}

/**
 * Build a full TotalPlan entity payload from coach-chosen inputs + the user's
 * body data. Returns null when there isn't enough to compute responsibly.
 * The returned object includes `total_weeks` (metadata for previews); strip it
 * before creating the entity if desired (extra fields are harmless).
 *
 * @param {object} args
 * @param {object} args.user           user record (weight_kg, height_cm, gender, age/birthday, body_fat_percentage?)
 * @param {"weight"|"body_fat"} args.goalType
 * @param {number} [args.goalWeightKg]   required when goalType === "weight"
 * @param {number} [args.goalBodyFat]    required when goalType === "body_fat"
 * @param {number} [args.weeklyPercentage] positive % of bodyweight/week (used when no targetDate)
 * @param {string} [args.targetDate]      ISO yyyy-MM-dd goal date — when set, plan length comes from the date
 * @param {number} [args.startingSteps]
 * @param {number} [args.startingCalories]
 * @param {string} [args.planName]
 * @param {string} [args.notes]
 */
export function buildTotalPlanPayload({
  user,
  goalType = "weight",
  goalWeightKg,
  goalBodyFat,
  weeklyPercentage,
  targetDate,
  startingSteps,
  startingCalories,
  planName,
  notes,
}) {
  if (!user) return null;
  const currentWeight = user.weight_kg;
  const heightCm = user.height_cm;
  const age = deriveAge(user);
  const gender = user.gender;
  if (!currentWeight || !heightCm || !age || (gender !== "male" && gender !== "female")) {
    return null;
  }

  const currentBodyFat = user.body_fat_percentage || 15;
  const startingLeanBodyMass = currentWeight * (1 - currentBodyFat / 100);

  // Resolve goal weight (kg).
  let resolvedGoalWeightKg;
  let resolvedGoalBodyFat = currentBodyFat;
  if (goalType === "body_fat") {
    const bf = parseFloat(goalBodyFat);
    if (isNaN(bf) || bf < 3 || bf > 50) return null;
    resolvedGoalBodyFat = bf;
    resolvedGoalWeightKg = startingLeanBodyMass / (1 - bf / 100);
  } else {
    resolvedGoalWeightKg = parseFloat(goalWeightKg);
    if (isNaN(resolvedGoalWeightKg) || resolvedGoalWeightKg <= 0) return null;
  }

  const totalChange = Math.abs(resolvedGoalWeightKg - currentWeight);
  if (totalChange === 0) return null;

  // Plan length comes from a target DATE when one is given (e.g. a show/event
  // date — the coach asks for this); otherwise from a sustainable weekly rate.
  let totalWeeks;
  if (targetDate) {
    const ms = new Date(targetDate).getTime();
    if (isNaN(ms)) return null;
    totalWeeks = Math.round((ms - Date.now()) / (7 * 24 * 60 * 60 * 1000));
  } else {
    const pct = parseFloat(weeklyPercentage);
    if (isNaN(pct) || pct <= 0) return null;
    const weeklyChangeKg = (currentWeight * pct) / 100;
    totalWeeks = Math.ceil(totalChange / weeklyChangeKg);
  }
  totalWeeks = Math.max(1, Math.min(totalWeeks, 52 * 2)); // sanity clamp

  const isWeightLoss = resolvedGoalWeightKg < currentWeight;
  const steps = parseInt(startingSteps, 10) || 10000;
  const cals = parseInt(startingCalories, 10) || 2000;

  const weekly_plan = generateWeeklyPlanData({
    totalWeeks,
    startWeightKg: currentWeight,
    goalWeightKg: resolvedGoalWeightKg,
    isWeightLoss,
    startingLeanBodyMass,
    heightCm,
    age,
    gender,
    startingSteps: steps,
    startingCalories: cals,
  });

  const startDate = new Date();
  const endDate = addWeeks(startDate, totalWeeks);

  return {
    plan_name: planName || `${isWeightLoss ? "Weight Loss" : "Weight Gain"} Plan`,
    start_date: format(startDate, "yyyy-MM-dd"),
    end_date: format(endDate, "yyyy-MM-dd"),
    goal_type: goalType,
    starting_weight_kg: currentWeight,
    starting_body_fat_percentage: currentBodyFat,
    starting_lean_body_mass_kg: startingLeanBodyMass,
    goal_weight_kg: resolvedGoalWeightKg,
    goal_body_fat_percentage: resolvedGoalBodyFat,
    starting_daily_steps: steps,
    starting_daily_calories: cals,
    weekly_plan,
    notes: notes || "",
    total_weeks: totalWeeks,
  };
}
