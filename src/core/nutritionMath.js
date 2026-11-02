/**
 * nutritionMath.js — deterministic calorie + macro target calculation.
 * Mirrors the math in src/components/settings/GoalsSection.jsx so the AI coach
 * sets the SAME numbers the app's own calculator would, rather than inventing
 * them. The coach decides the inputs (goal direction, a sustainable rate,
 * activity level) from the conversation; the numbers come from here.
 */

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

/**
 * @param {object} args
 * @param {number} args.weightKg
 * @param {number} args.heightCm
 * @param {number} args.age
 * @param {"male"|"female"} args.sex
 * @param {string} [args.activityLevel="moderately_active"]
 * @param {number} [args.weeklyChangePctBodyweight=0]  Signed % of bodyweight/week.
 *        Negative = loss, positive = gain, 0 = maintain.
 * @returns {null | { calories, protein, carbs, fat, tdee, bmr }}
 *          null when body data is insufficient to compute responsibly.
 */
export function computeNutritionTargets({
  weightKg,
  heightCm,
  age,
  sex,
  activityLevel = "moderately_active",
  weeklyChangePctBodyweight = 0,
}) {
  if (!weightKg || !heightCm || !age || (sex !== "male" && sex !== "female")) {
    return null;
  }

  const bmr =
    sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderately_active);

  let targetCalories = tdee;
  const pct = Number(weeklyChangePctBodyweight) || 0;
  if (pct !== 0) {
    const weeklyChangeKg = (Math.abs(pct) / 100) * weightKg;
    const dailyCalorieChange = (weeklyChangeKg * 7700) / 7;
    targetCalories = pct < 0 ? tdee - dailyCalorieChange : tdee + dailyCalorieChange;
  }

  const weightLbs = weightKg * 2.20462;
  const protein = weightLbs * 0.8;
  const fat = weightLbs * 0.25;
  const carbs = Math.max(0, (targetCalories - protein * 4 - fat * 9) / 4);

  return {
    calories: Math.round(targetCalories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    tdee: Math.round(tdee),
    bmr: Math.round(bmr),
  };
}

/** Macros for a given calorie target, using the same protein/fat formula. */
export function macrosForCalories({ weightKg, calories }) {
  if (!weightKg || !calories) return null;
  const weightLbs = weightKg * 2.20462;
  const protein = weightLbs * 0.8;
  const fat = weightLbs * 0.25;
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

/** Derive age (years) from a user record's age or birthday field. */
export function deriveAge(user) {
  if (!user) return null;
  if (user.age) return parseInt(user.age, 10);
  const dob = user.birthday || user.birthdate;
  if (dob) {
    const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 864e5));
    if (years > 0 && years < 120) return years;
  }
  return null;
}
