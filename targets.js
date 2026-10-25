// Stage 2: daily calorie and macro targets from a profile. Pure maths, no AI.
// All results are estimates (Mifflin-St Jeor is an average-person formula).

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,    // little or no exercise
  light: 1.375,      // 1 to 3 days a week
  moderate: 1.55,    // 3 to 5 days a week
  active: 1.725,     // 6 to 7 days a week
  very_active: 1.9,  // hard exercise plus a physical job
};

export const GOAL_ADJUSTMENT_KCAL = { lose: -500, maintain: 0, gain: 300 };

const MAX_DEFICIT_FRACTION = 0.2;          // never more than 20% below maintenance
const FLOOR_KCAL = { male: 1500, female: 1200 };
const PROTEIN_G_PER_KG = 1.8;
const FAT_FRACTION = 0.25;                 // of daily calories
export const LUNCH_DINNER_FRACTION = 0.65;

const LIMITS = { weightKg: [30, 300], heightCm: [120, 230], age: [18, 90] };

function validate(p) {
  const errors = [];
  if (!p || typeof p !== "object") return ["Profile is missing."];
  const checkNumber = (key, label, unit) => {
    const [lo, hi] = LIMITS[key];
    if (typeof p[key] !== "number" || !Number.isFinite(p[key])) errors.push(`${label} must be a number.`);
    else if (p[key] < lo || p[key] > hi) errors.push(`${label} must be between ${lo} and ${hi}${unit}.`);
  };
  checkNumber("weightKg", "Weight", " kg");
  checkNumber("heightCm", "Height", " cm");
  checkNumber("age", "Age", " years");
  if (!["male", "female"].includes(p.sex)) errors.push('Sex must be "male" or "female".');
  if (!(p.activity in ACTIVITY_MULTIPLIERS)) errors.push(`Activity must be one of: ${Object.keys(ACTIVITY_MULTIPLIERS).join(", ")}.`);
  if (!(p.goal in GOAL_ADJUSTMENT_KCAL)) errors.push('Goal must be "lose", "maintain" or "gain".');
  return errors;
}

// profile: { weightKg, heightCm, age, sex: "male"|"female", activity, goal }
// Returns { ok: false, errors: [...] } for bad input, otherwise { ok: true, ... }.
export function calculateTargets(profile) {
  const errors = validate(profile);
  if (errors.length) return { ok: false, errors };

  const { weightKg, heightCm, age, sex, activity, goal } = profile;
  const notes = [];

  // Mifflin-St Jeor resting calories
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
  const maintenance = bmr * ACTIVITY_MULTIPLIERS[activity];

  let daily = maintenance + GOAL_ADJUSTMENT_KCAL[goal];

  if (goal === "lose") {
    const minAllowed = maintenance * (1 - MAX_DEFICIT_FRACTION);
    if (daily < minAllowed) {
      daily = minAllowed;
      notes.push("Deficit capped at 20% below maintenance.");
    }
    // The floor only applies to losing; it never lifts a maintain or gain target.
    if (daily < FLOOR_KCAL[sex]) {
      daily = Math.min(FLOOR_KCAL[sex], maintenance);
      notes.push(`Raised to the ${FLOOR_KCAL[sex]} kcal minimum for ${sex === "male" ? "men" : "women"}.`);
    }
  }

  // Macros (grams), kept unrounded until the end
  const protein = PROTEIN_G_PER_KG * weightKg;
  const fat = (daily * FAT_FRACTION) / 9;
  let carbs = (daily - protein * 4 - fat * 9) / 4;
  if (carbs < 0) {
    carbs = 0;
    notes.push("Protein and fat already use all the calories, so carbs are 0.");
  }

  const scale = (f) => ({
    kcal: Math.round(daily * f),
    protein: Math.round(protein * f),
    carbs: Math.round(carbs * f),
    fat: Math.round(fat * f),
  });

  return {
    ok: true,
    maintenanceKcal: Math.round(maintenance),
    daily: scale(1),
    lunchDinner: scale(LUNCH_DINNER_FRACTION),
    notes,
  };
}
