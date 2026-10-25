// Run: node test-targets.js
// Each expected value below was worked out by hand (see comments), not copied from the function.
import { calculateTargets } from "./targets.js";

let failed = 0;
const eq = (label, got, want) => {
  if (got !== want) { failed++; console.log(`FAIL ${label}: got ${got}, want ${want}`); }
};
const expectTargets = (name, profile, want) => {
  const r = calculateTargets(profile);
  if (!r.ok) { failed++; console.log(`FAIL ${name}: ${r.errors}`); return; }
  eq(`${name} maintenance`, r.maintenanceKcal, want.maintenance);
  for (const k of ["kcal", "protein", "carbs", "fat"]) {
    eq(`${name} daily ${k}`, r.daily[k], want.daily[k]);
    eq(`${name} lunchDinner ${k}`, r.lunchDinner[k], want.ld[k]);
  }
  eq(`${name} notes`, r.notes.length, want.notes);
};

// ---- Person A: male, 80 kg, 180 cm, 30 y, moderate (1.55), maintain ----
// BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
// Maintenance = 1780 * 1.55 = 2759. Maintain: no change, daily = 2759.
// Protein = 1.8 * 80 = 144 g (576 kcal). Fat = 2759 * 0.25 / 9 = 76.6 g (689.75 kcal).
// Carbs = (2759 - 576 - 689.75) / 4 = 373.3 g.
// Lunch+dinner (65%): kcal 1793.35 -> 1793, protein 93.6 -> 94, fat 49.8 -> 50, carbs 242.7 -> 243.
expectTargets("A maintain",
  { weightKg: 80, heightCm: 180, age: 30, sex: "male", activity: "moderate", goal: "maintain" },
  { maintenance: 2759, daily: { kcal: 2759, protein: 144, carbs: 373, fat: 77 }, ld: { kcal: 1793, protein: 94, carbs: 243, fat: 50 }, notes: 0 });

// ---- Person B: female, 60 kg, 165 cm, 25 y, light (1.375), lose: the 20% cap applies ----
// BMR = 600 + 1031.25 - 125 - 161 = 1345.25. Maintenance = 1345.25 * 1.375 = 1849.72.
// Lose would be 1849.72 - 500 = 1349.72, but the cap is 80% of maintenance = 1479.78, so use 1479.78.
// Protein = 108 g (432 kcal). Fat = 1479.78 * 0.25 / 9 = 41.1 g (369.9 kcal).
// Carbs = (1479.78 - 432 - 369.94) / 4 = 169.5 g -> 169 (169.47).
// Lunch+dinner: kcal 961.86 -> 962, protein 70.2 -> 70, fat 26.7 -> 27, carbs 110.2 -> 110.
expectTargets("B lose capped",
  { weightKg: 60, heightCm: 165, age: 25, sex: "female", activity: "light", goal: "lose" },
  { maintenance: 1850, daily: { kcal: 1480, protein: 108, carbs: 169, fat: 41 }, ld: { kcal: 962, protein: 70, carbs: 110, fat: 27 }, notes: 1 });

// ---- Person C: female, 50 kg, 155 cm, 40 y, sedentary (1.2), lose: the 1200 floor applies ----
// BMR = 500 + 968.75 - 200 - 161 = 1107.75. Maintenance = 1107.75 * 1.2 = 1329.3.
// Lose = 829.3; 20% cap = 1063.44 (still too low); floor for women = 1200, so use 1200.
// Protein = 90 g (360 kcal). Fat = 1200 * 0.25 / 9 = 33.3 g (300 kcal). Carbs = (1200 - 360 - 300) / 4 = 135 g.
// Lunch+dinner: kcal 780, protein 58.5 -> 59 (JS rounds .5 up), fat 21.7 -> 22, carbs 87.75 -> 88.
expectTargets("C lose floor",
  { weightKg: 50, heightCm: 155, age: 40, sex: "female", activity: "sedentary", goal: "lose" },
  { maintenance: 1329, daily: { kcal: 1200, protein: 90, carbs: 135, fat: 33 }, ld: { kcal: 780, protein: 59, carbs: 88, fat: 22 }, notes: 2 });

// ---- Extra D: male, 100 kg, 180 cm, 30 y, moderate, lose: plain -500, no cap ----
// BMR = 1000 + 1125 - 150 + 5 = 1980. Maintenance = 1980 * 1.55 = 3069. Lose = 2569; cap = 2455.2, so not capped.
// Protein = 180 g (720 kcal). Fat = 2569 * 0.25 / 9 = 71.4 g (642.25 kcal). Carbs = (2569 - 720 - 642.25) / 4 = 301.7 g.
// Lunch+dinner: kcal 1669.85 -> 1670, protein 117, fat 46.4 -> 46, carbs 196.1 -> 196.
expectTargets("D lose plain",
  { weightKg: 100, heightCm: 180, age: 30, sex: "male", activity: "moderate", goal: "lose" },
  { maintenance: 3069, daily: { kcal: 2569, protein: 180, carbs: 302, fat: 71 }, ld: { kcal: 1670, protein: 117, carbs: 196, fat: 46 }, notes: 0 });

// ---- Extra E: male, 70 kg, 175 cm, 22 y, very active (1.9), gain: +300 ----
// BMR = 700 + 1093.75 - 110 + 5 = 1688.75. Maintenance = 1688.75 * 1.9 = 3208.63. Gain = 3508.63.
// Protein = 126 g (504 kcal). Fat = 3508.63 * 0.25 / 9 = 97.5 g. Carbs = (3508.63 - 504 - 877.16) / 4 = 531.9 g.
// Lunch+dinner: kcal 2280.6 -> 2281, protein 81.9 -> 82, fat 63.3 -> 63, carbs 345.7 -> 346.
expectTargets("E gain",
  { weightKg: 70, heightCm: 175, age: 22, sex: "male", activity: "very_active", goal: "gain" },
  { maintenance: 3209, daily: { kcal: 3509, protein: 126, carbs: 532, fat: 97 }, ld: { kcal: 2281, protein: 82, carbs: 346, fat: 63 }, notes: 0 });

// ---- Macros add back up to the calories (within rounding), for every example ----
for (const p of [
  { weightKg: 80, heightCm: 180, age: 30, sex: "male", activity: "moderate", goal: "maintain" },
  { weightKg: 50, heightCm: 155, age: 40, sex: "female", activity: "sedentary", goal: "lose" },
]) {
  const d = calculateTargets(p).daily;
  const back = d.protein * 4 + d.carbs * 4 + d.fat * 9;
  if (Math.abs(back - d.kcal) > 10) { failed++; console.log(`FAIL macros sum ${back} vs ${d.kcal}`); }
}

// ---- Bad input returns a clear error, never a number ----
const good = { weightKg: 70, heightCm: 170, age: 30, sex: "male", activity: "light", goal: "maintain" };
const bad = (label, patch, expectText) => {
  const r = calculateTargets({ ...good, ...patch });
  if (r.ok || !r.errors.some((e) => e.includes(expectText))) { failed++; console.log(`FAIL bad input "${label}":`, JSON.stringify(r)); }
};
bad("weight too low", { weightKg: 10 }, "Weight");
bad("weight as text", { weightKg: "70" }, "Weight");
bad("height too high", { heightCm: 500 }, "Height");
bad("age too low", { age: 12 }, "Age");
bad("NaN age", { age: NaN }, "Age");
bad("bad sex", { sex: "other" }, "Sex");
bad("bad activity", { activity: "couch" }, "Activity");
bad("bad goal", { goal: "bulk" }, "Goal");
if (calculateTargets(undefined).ok) { failed++; console.log("FAIL missing profile accepted"); }
if (calculateTargets({}).errors.length !== 6) { failed++; console.log("FAIL empty profile should give 6 errors"); }

console.log(failed ? `${failed} check(s) failed` : "OK: all target tests passed");
process.exit(failed ? 1 : 0);
