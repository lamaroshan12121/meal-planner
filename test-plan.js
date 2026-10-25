// Run: node test-plan.js
// Expected values were worked out by hand from ingredients.js (see the comments), not copied from the function.
import { checkPlan } from "./plan.js";

const TARGET = { kcal: 1767, protein: 67, carbs: 265, fat: 49 }; // lunch + dinner target (the Stage 2 example person)

let failed = 0;
const eq = (label, got, want) => { if (got !== want) { failed++; console.log(`FAIL ${label}: got ${got}, want ${want}`); } };
const near = (label, got, want, tol = 0.05) => { if (Math.abs(got - want) > tol) { failed++; console.log(`FAIL ${label}: got ${got}, want ${want}`); } };
const types = (r) => r.problems.map((p) => p.type).sort().join(",");

const meal = (name, ...items) => ({ name, items: items.map(([ingredientId, grams]) => ({ ingredientId, grams })) });
const week = (pairs) => ({ days: pairs.map(([lunch, dinner]) => ({ lunch, dinner })) });

// ---------------- Meals used in plans 1 and 3 ----------------
// M1 Chicken rice bowl: chicken 250 g, rice 140 g, mixed veg 150 g
//   kcal 250*1.2=300 + 140*3.65=511 + 150*0.6=90 = 901.   P 56.25+9.94+4.5=70.69  C 0+112+15=127  F 6.5+0.98+0.75=8.23
// M2 Beef pasta: beef mince 150, pasta 140, diced tomatoes 200
//   kcal 315 + 519.4 + 40 = 874.4.   P 28.5+18.2+2=48.7  C 0+104.58+8=112.58  F 21+2.1+0.2=23.3
// M3 Egg potato hash: eggs 240, potatoes 500, sunflower oil 10
//   kcal 343.2 + 385 + 88.4 = 816.6.  P 30.24+10+0=40.24  C 1.68+85+0=86.68  F 22.8+0.5+10=33.3
// M4 Lentil rice: red lentils 100, rice 100, mixed veg 200, oil 10
//   kcal 358 + 365 + 120 + 88.4 = 931.4.
// M5 Chicken potato: chicken 300, potatoes 400, green beans 200, oil 10
//   kcal 360 + 308 + 62 + 88.4 = 818.4.
const M1 = () => meal("Chicken rice bowl", ["chicken-breast", 250], ["rice", 140], ["frozen-mixed-veg", 150]);
const M2 = () => meal("Beef pasta", ["beef-mince", 150], ["pasta", 140], ["diced-tomatoes", 200]);
const M3 = () => meal("Egg potato hash", ["eggs", 240], ["potatoes", 500], ["sunflower-oil", 10]);
const M4 = () => meal("Lentil rice", ["red-lentils", 100], ["rice", 100], ["frozen-mixed-veg", 200], ["sunflower-oil", 10]);
const M5 = () => meal("Chicken potato", ["chicken-breast", 300], ["potatoes", 400], ["frozen-green-beans", 200], ["sunflower-oil", 10]);

// =====================================================================================
// PLAN 1: a good plan, $65 budget, 1767 kcal target. Each of the 5 meals is used exactly twice.
//   Mon M1+M2   Tue M3+M4   Wed M5+M1   Thu M2+M3   Fri M4+M5
// Day kcal:
//   Mon 901 + 874.4 = 1775.4  (+0.5% vs 1767)
//   Tue 816.6 + 931.4 = 1748.0 (-1.1%)
//   Wed 818.4 + 901 = 1719.4  (-2.7%)
//   Thu 874.4 + 816.6 = 1691.0 (-4.3%)
//   Fri 931.4 + 818.4 = 1749.8 (-1.0%)      all inside the 10% limit (1590 to 1944)
// Mon macros: P 70.69+48.7 = 119.39, C 127+112.58 = 239.58, F 8.23+23.3 = 31.53
// Week grams (each meal twice):
//   chicken 250*2 + 300*2 = 1100 g   "weight": 1.1 * 11.99 = 13.189 -> $13.19
//   potatoes 500*2 + 400*2 = 1800 g  "weight": 1.8 * 3.99  = 7.182  -> $7.18
//   rice 140*2 + 100*2 = 480 g       1 pack of 2000  -> $3.59
//   mixed veg 150*2 + 200*2 = 700 g  1 pack of 1000  -> $2.79
//   beef mince 300 g                 1 pack of 500   -> $6.49
//   pasta 280 g                      1 pack of 500   -> $0.89
//   diced tomatoes 400 g             EXACTLY 1 pack of 400 (must not round up to 2) -> $0.95
//   eggs 480 g                       1 pack of 620   -> $5.29
//   oil 10*2 (M3) + 10*2 (M4) + 10*2 (M5) = 60 g, 1 pack of 920 -> $4.99
//   red lentils 200 g                1 pack of 500   -> $1.69
//   green beans 400 g                1 pack of 1000  -> $2.79
// Total = 13.19 + 7.18 + 3.59 + 2.79 + 6.49 + 0.89 + 0.95 + 5.29 + 4.99 + 1.69 + 2.79 = $49.84  (under $65)
// =====================================================================================
const plan1 = week([[M1(), M2()], [M3(), M4()], [M5(), M1()], [M2(), M3()], [M4(), M5()]]);
const r1 = checkPlan(plan1, TARGET, 65);
eq("plan1 ok", r1.ok, true);
eq("plan1 meal count", r1.meals.length, 10);
eq("plan1 Mon lunch kcal", r1.meals[0].totals.kcal, 901);
eq("plan1 Mon dinner kcal", r1.meals[1].totals.kcal, 874);
near("plan1 Mon lunch protein", r1.meals[0].totals.protein, 70.7);
eq("plan1 Mon kcal", r1.days[0].totals.kcal, 1775);
near("plan1 Mon protein", r1.days[0].totals.protein, 119.4);
near("plan1 Mon carbs", r1.days[0].totals.carbs, 239.6);
near("plan1 Mon fat", r1.days[0].totals.fat, 31.5);
eq("plan1 Tue kcal", r1.days[1].totals.kcal, 1748);
eq("plan1 Wed kcal", r1.days[2].totals.kcal, 1719);
eq("plan1 Thu kcal", r1.days[3].totals.kcal, 1691);
eq("plan1 Fri kcal", r1.days[4].totals.kcal, 1750);
near("plan1 Mon diffPct", r1.days[0].diffPct, 0.5);
eq("plan1 week kcal", r1.week.totals.kcal, 8684); // 1775.4+1748+1719.4+1691+1749.8 = 8683.6
near("plan1 total cost", r1.cost.total, 49.84, 0.001);
eq("plan1 overBy", r1.cost.overBy, 0);
const line = (r, id) => r.shoppingList.find((l) => l.ingredientId === id);
near("plan1 chicken cost", line(r1, "chicken-breast").cost, 13.19, 0.001);
eq("plan1 chicken packs (weight item)", line(r1, "chicken-breast").packs, null);
near("plan1 potatoes cost", line(r1, "potatoes").cost, 7.18, 0.001);
eq("plan1 rice grams", line(r1, "rice").grams, 480);
eq("plan1 rice packs", line(r1, "rice").packs, 1);
eq("plan1 rice leftover", line(r1, "rice").leftoverGrams, 1520);
eq("plan1 tomatoes packs (exact multiple)", line(r1, "diced-tomatoes").packs, 1);
eq("plan1 oil grams", line(r1, "sunflower-oil").grams, 60);
eq("plan1 shopping list lines", r1.shoppingList.length, 11);
eq("plan1 problems", types(r1), "");
eq("plan1 passes", r1.passes, true);
// Line costs add up to the total (no cent drift)
near("plan1 lines sum to total", r1.shoppingList.reduce((s, l) => s + l.cost, 0), r1.cost.total, 0.001);
// Traceability: a meal's items add up to the meal total
near("plan1 Mon lunch items sum", r1.meals[0].items.reduce((s, i) => s + i.kcal, 0), r1.meals[0].totals.kcal, 0.5);

// Estimated cost per meal (display only): grams used / pack size * price, "weight" items per 1000 g.
//   Mon lunch M1: chicken 0.25 kg * 11.99 = 2.9975 + rice 140/2000 * 3.59 = 0.2513 + veg 150/1000 * 2.79 = 0.4185 = 3.6673 -> $3.67
//   Mon dinner M2: beef 150/500 * 6.49 = 1.947 + pasta 140/500 * 0.89 = 0.2492 + tomatoes 200/400 * 0.95 = 0.475 = 2.6712 -> $2.67
near("plan1 Mon lunch estCost", r1.meals[0].estCost, 3.67, 0.001);
near("plan1 Mon dinner estCost", r1.meals[1].estCost, 2.67, 0.001);
// Whole week by grams used (no pack rounding): chicken 13.189 + rice 0.8616 + veg 1.953 + beef 3.894 + pasta 0.4984
//   + tomatoes 0.95 + eggs 480/620*5.29 = 4.0955 + potatoes 7.182 + oil 60/920*4.99 = 0.3254 + lentils 0.676 + beans 1.116 = 34.74
// The ten rounded meal estimates add up to about that (within a few cents), and are less than the real $49.84 because packs have leftovers.
const mealSum = r1.meals.reduce((s, m) => s + m.estCost, 0);
near("plan1 meal estimates sum to grams-used cost", mealSum, 34.74, 0.06);
eq("plan1 estimates below whole-pack total", mealSum < r1.cost.total, true);
eq("plan1 has a cost note", typeof r1.mealCostNote === "string" && r1.mealCostNote.includes("estimates"), true);

// Budget edge: $49.84 exactly is fine, one cent less is over by $0.01
eq("plan1 at exact budget", checkPlan(plan1, TARGET, 49.84).passes, true);
const r1tight = checkPlan(plan1, TARGET, 49.83);
eq("plan1 one cent over", types(r1tight), "over-budget");
near("plan1 one cent overBy", r1tight.cost.overBy, 0.01, 0.0001);

// =====================================================================================
// PLAN 2: all-salmon plan, over the $65 budget. Every meal has salmon 250 g (salmon: 208 kcal per 100 g).
//   P1 Salmon and rice:    salmon 250 + rice 100             = 520 + 365 = 885.0
//   P2 Salmon and pasta:   salmon 250 + pasta 100            = 520 + 371 = 891.0
//   P3 Salmon and potato:  salmon 250 + potatoes 450         = 520 + 346.5 = 866.5
//   P4 Salmon and lentils: salmon 250 + red lentils 100      = 520 + 358 = 878.0
//   P5 Salmon, peas, rice: salmon 250 + peas 300 + rice 50   = 520 + 210 + 182.5 = 912.5
//   Layout: Mon P1+P2  Tue P3+P4  Wed P5+P1  Thu P2+P3  Fri P4+P5, so each is used twice.
//   Day kcal: Mon 1776, Tue 1744.5, Wed 1797.5, Thu 1757.5, Fri 1790.5  (all inside 10%)
// Week grams and cost:
//   salmon 250*10 = 2500 g = EXACTLY 10 packs of 250 -> 10 * 7.99 = $79.90
//   rice 100*2 + 50*2 = 300 g -> 1 pack $3.59     pasta 200 g -> 1 pack $0.89
//   potatoes 450*2 = 900 g, weight: 0.9 * 3.99 = 3.591 -> $3.59
//   lentils 200 g -> 1 pack $1.69                 peas 600 g -> 1 pack $2.49
// Total = 79.90 + 3.59 + 0.89 + 3.59 + 1.69 + 2.49 = $92.15, which is $27.15 over $65.
// =====================================================================================
const P1 = () => meal("Salmon and rice", ["salmon", 250], ["rice", 100]);
const P2 = () => meal("Salmon and pasta", ["salmon", 250], ["pasta", 100]);
const P3 = () => meal("Salmon and potato", ["salmon", 250], ["potatoes", 450]);
const P4 = () => meal("Salmon and lentils", ["salmon", 250], ["red-lentils", 100]);
const P5 = () => meal("Salmon, peas and rice", ["salmon", 250], ["frozen-peas", 300], ["rice", 50]);
const r2 = checkPlan(week([[P1(), P2()], [P3(), P4()], [P5(), P1()], [P2(), P3()], [P4(), P5()]]), TARGET, 65);
eq("plan2 Mon kcal", r2.days[0].totals.kcal, 1776);
// P1: salmon 250/250 * 7.99 = 7.99 + rice 100/2000 * 3.59 = 0.1795 = 8.1695 -> $8.17
near("plan2 Mon lunch estCost", r2.meals[0].estCost, 8.17, 0.001);
eq("plan2 Wed kcal", r2.days[2].totals.kcal, 1798); // 1797.5 rounds up
eq("plan2 salmon packs", line(r2, "salmon").packs, 10);
near("plan2 salmon cost", line(r2, "salmon").cost, 79.9, 0.001);
near("plan2 potatoes cost", line(r2, "potatoes").cost, 3.59, 0.001);
near("plan2 total cost", r2.cost.total, 92.15, 0.001);
near("plan2 overBy", r2.cost.overBy, 27.15, 0.001);
eq("plan2 problems", types(r2), "over-budget");
eq("plan2 message names the amount", r2.problems[0].message.includes("$27.15"), true);
eq("plan2 passes", r2.passes, false);

// =====================================================================================
// PLAN 3: unknown ingredient + a day far off target + a meal used 3 times.
//   Mon lunch  "Tuna pasta": tuna 185 g (100 kcal/100 g = 185) + pasta 100 g (371) = 556
//   Mon dinner "Wagyu stew": wagyu-beef 200 g (NOT IN THE LIST, ignored) + rice 100 g (365) = 365
//   Mon = 921 kcal: (921 - 1767) / 1767 = -47.9%, far outside 10%.
//   Tue M1+M1 = 1802 (+2.0%), Wed M1+M2 = 901+874.4 = 1775.4, Thu M2+M3 = 1691, Fri M4+M3 = 931.4+816.6 = 1748
//   "Chicken rice bowl" (M1) appears Tue lunch, Tue dinner, Wed lunch = 3 times, so it is flagged. M2 and M3 appear twice (allowed).
//   Cost (unknown ingredient costs nothing): tuna 1.69 + pasta (100+140*2=380 g, 1 pack) 0.89 + rice (100+140*3+100=620 g, 1 pack) 3.59
//   + chicken 750 g weight 0.75*11.99=8.9925 -> 8.99 + veg (150*3+200=650 g, 1 pack) 2.79 + beef 300 g 6.49 + tomatoes 400 g 0.95
//   + eggs 480 g 5.29 + potatoes 1000 g, 1.0*3.99 = 3.99 + oil 30 g 4.99 + lentils 100 g 1.69 = $41.35 (under $65)
//   Expected problems: unknown-ingredient, day-calories (Mon), repeated-meal. No over-budget.
// =====================================================================================
const r3 = checkPlan(week([
  [meal("Tuna pasta", ["tuna", 185], ["pasta", 100]), meal("Wagyu stew", ["wagyu-beef", 200], ["rice", 100])],
  [M1(), M1()],
  [M1(), M2()],
  [M2(), M3()],
  [M4(), M3()],
]), TARGET, 65);
eq("plan3 ok", r3.ok, true);
eq("plan3 problems", types(r3), "day-calories,repeated-meal,unknown-ingredient");
eq("plan3 unknown id", r3.problems.find((p) => p.type === "unknown-ingredient").ingredientId, "wagyu-beef");
eq("plan3 Mon dinner kcal ignores unknown", r3.meals[1].totals.kcal, 365);
eq("plan3 Mon kcal", r3.days[0].totals.kcal, 921);
near("plan3 Mon diffPct", r3.days[0].diffPct, -47.9);
eq("plan3 only Mon flagged", r3.problems.filter((p) => p.type === "day-calories").map((p) => p.day).join(), "Mon");
const rep = r3.problems.find((p) => p.type === "repeated-meal");
eq("plan3 repeated meal", rep.name, "Chicken rice bowl");
eq("plan3 repeated count", rep.count, 3);
eq("plan3 repeated where", rep.where.join(), "Tue lunch,Tue dinner,Wed lunch");
eq("plan3 wagyu not in shopping list", r3.shoppingList.some((l) => l.ingredientId === "wagyu-beef"), false);
near("plan3 chicken cost", line(r3, "chicken-breast").cost, 8.99, 0.001);
near("plan3 total cost", r3.cost.total, 41.35, 0.001);

// =====================================================================================
// Small edge cases
// =====================================================================================
// The 10% limit: exactly 10% off is allowed, only "more than 10%" is flagged.
// Custom food "x" has 100 kcal per 100 g, so 1 g = 1 kcal. Every day = lunch grams + 500 g dinner. Target 1000 kcal.
//   lunch 600 g -> day 1100 (exactly +10%): allowed.  lunch 610 -> 1110 (+11%): flagged.  lunch 400 -> 900 (exactly -10%): allowed.
// (The repeat flags also fire here because the fake meals are identical; we only look at day-calories.)
const custom = [{ id: "x", name: "Test food", packGrams: 100, price: 1, pricing: "pack", per100g: { kcal: 100, protein: 0, carbs: 0, fat: 0 } }];
const tenDay = (grams) => week(Array.from({ length: 5 }, (_, i) => [meal(`A${i}`, ["x", grams]), meal(`B${i}`, ["x", 500])]));
const dayFlagged = (grams, goal) => checkPlan(tenDay(grams), { kcal: 1000 }, 9999, custom, goal ? { goal } : {}).problems.some((p) => p.type === "day-calories");
eq("edge: day exactly 10% over is allowed", dayFlagged(600), false);
eq("edge: day 11% over is flagged", dayFlagged(610), true);
eq("edge: day exactly 10% under is allowed", dayFlagged(400), false);
eq("edge: day 11% under is flagged", dayFlagged(390), true);

// ---- Goal-dependent calorie rule (target 1000 kcal, day = lunch grams + 500) ----
//   lose / maintain: more than 10% either way is flagged (the default with no goal is "maintain").
//   gain: more than 10% UNDER is flagged; OVER is flagged only above +50% (1500 kcal).
for (const goal of ["lose", "maintain"]) {
  eq(`${goal}: 1350 (+35%) is flagged`, dayFlagged(850, goal), true);
  eq(`${goal}: 1100 (+10%) is allowed`, dayFlagged(600, goal), false);
  eq(`${goal}: 890 (-11%) is flagged`, dayFlagged(390, goal), true);
}
eq("gain: 1350 (+35%) is allowed", dayFlagged(850, "gain"), false);
eq("gain: 1500 (exactly +50%) is allowed", dayFlagged(1000, "gain"), false);
eq("gain: 1510 (+51%) is flagged", dayFlagged(1010, "gain"), true);
eq("gain: 900 (exactly -10%) is allowed", dayFlagged(400, "gain"), false);
eq("gain: 890 (-11%) is flagged", dayFlagged(390, "gain"), true);
eq("bad goal rejected", checkPlan(plan1, TARGET, 65, undefined, { goal: "bulk" }).ok, false);

// Same real plan (plan1, hand-checked above), different targets. Plan 1 days: 1775.4, 1748.0, 1719.4, 1691.0, 1749.8 kcal.
//  Target 1300: every day is over by 30.1% to 36.6% (1691/1300 = 1.3008 ... 1775.4/1300 = 1.3657), i.e. about 35% over.
//     gain -> passes (over is fine below +50%).   maintain / lose / no goal -> all 5 days flagged as over.
const g35 = checkPlan(plan1, { kcal: 1300 }, 65, undefined, { goal: "gain" });
eq("gain plan ~35% over passes", g35.passes, true);
eq("gain plan ~35% over has no problems", g35.problems.length, 0);
near("gain Mon diffPct is +36.6", g35.days[0].diffPct, 36.6, 0.05);
for (const opts of [{ goal: "maintain" }, { goal: "lose" }, {}]) {
  const r = checkPlan(plan1, { kcal: 1300 }, 65, undefined, opts);
  eq(`${opts.goal || "default"} plan ~35% over fails`, r.passes, false);
  eq(`${opts.goal || "default"} plan ~35% over: 5 day problems`, r.problems.filter((p) => p.type === "day-calories" && p.direction === "over").length, 5);
}
//  Target 1900: Thu is 1691/1900 = -11.0% (flagged); the other days are -6.6%, -8.0%, -9.5%, -7.9% (fine). Same for every goal.
for (const goal of ["gain", "maintain"]) {
  const r = checkPlan(plan1, { kcal: 1900 }, 65, undefined, { goal });
  eq(`${goal} target 1900: only Thu flagged`, r.problems.map((p) => `${p.day}:${p.direction}`).join(), "Thu:under");
}
//  Target 1100: days are +53.7% to +61.4% over, beyond the +50% sanity limit, so gain flags all 5 as over.
const g50 = checkPlan(plan1, { kcal: 1100 }, 65, undefined, { goal: "gain" });
eq("gain target 1100: 5 days over the sanity limit", g50.problems.filter((p) => p.direction === "over").length, 5);
eq("gain over message names the sanity limit", g50.problems[0].message.includes("sanity limit is 50% above"), true);
eq("gain under message says gain plan", checkPlan(plan1, { kcal: 1900 }, 65, undefined, { goal: "gain" }).problems[0].message.includes("a gain plan may be at most 10% below"), true);

// Repeats: same name in different case counts as the same meal; same ingredients and grams under a new name also counts.
const sneaky = week([
  [meal("Chicken rice bowl", ["chicken-breast", 250], ["rice", 140]), meal("chicken  RICE bowl", ["chicken-breast", 100])],
  [meal("Bowl X", ["rice", 100]), meal("Bowl Y", ["rice", 100])],
  [meal("Bowl Z", ["rice", 100]), meal("Other 1", ["pasta", 100])],
  [meal("Other 2", ["pasta", 120]), meal("Other 3", ["pasta", 130])],
  [meal("Chicken rice bowl", ["tuna", 100]), meal("Other 4", ["pasta", 140])],
]);
const rs = checkPlan(sneaky, TARGET, 999);
const repeats = rs.problems.filter((p) => p.type === "repeated-meal");
eq("repeats: two groups found", repeats.length, 2);
eq("repeats: name group of 3", repeats.find((p) => p.name === "Chicken rice bowl")?.count, 3);
eq("repeats: same-ingredients group of 3", repeats.find((p) => p.name === "Bowl X")?.count, 3);

// Bad grams are flagged and left out
const rg = checkPlan(week(Array.from({ length: 5 }, (_, i) => [meal(`L${i}`, ["rice", -5]), meal(`D${i}`, ["pasta", 100])])), TARGET, 999);
eq("bad grams flagged", rg.problems.filter((p) => p.type === "bad-grams").length, 5);

// Badly shaped input returns clear errors, not a crash
eq("4 days rejected", checkPlan({ days: plan1.days.slice(0, 4) }, TARGET, 65).ok, false);
eq("no plan rejected", checkPlan(undefined, TARGET, 65).ok, false);
eq("missing meal name rejected", checkPlan(week(Array.from({ length: 5 }, () => [{ items: [{ ingredientId: "rice", grams: 1 }] }, M1()])), TARGET, 65).ok, false);
eq("empty items rejected", checkPlan(week(Array.from({ length: 5 }, () => [meal("Empty"), M1()])), TARGET, 65).ok, false);
eq("bad budget rejected", checkPlan(plan1, TARGET, 0).ok, false);
eq("bad target rejected", checkPlan(plan1, {}, 65).ok, false);

console.log(failed ? `${failed} check(s) failed` : "OK: all plan tests passed");
process.exit(failed ? 1 : 0);
