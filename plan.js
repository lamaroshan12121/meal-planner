// Stage 3: plan calculator and checker. Pure maths, no AI.
// The AI only supplies two recipes, each a name and { ingredientId, grams } for ONE serving. Everything else is worked out
// here from ingredients.js.
//
// BULK COOKING: recipes = { lunch: Meal, dinner: Meal }. expandRecipes turns them into 5 identical days (Mon to Fri), and
// checkRecipes checks that plan, so the shopping list and cost are for 5 servings of each recipe.
//
// plan = { days: [ { day: "Mon", lunch: Meal, dinner: Meal }, ... 5 days ] }   (checkPlan accepts any 5 days, identical or not)
// Meal = { name: "Chicken rice bowl", items: [ { ingredientId: "rice", grams: 140 }, ... ] }

import { ingredients as defaultIngredients } from "./ingredients.js";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SLOTS = ["lunch", "dinner"];
// How far a day's lunch+dinner calories may be from the target, as a fraction of the target. Depends on the goal:
//   lose / maintain: up to 10% either way.
//   gain: up to 10% under, but going over is fine (it only helps a surplus) until a 50% sanity limit.
export const GOALS = ["lose", "maintain", "gain"];
export const KCAL_LIMITS = {
  lose: { under: 0.1, over: 0.1 },
  maintain: { under: 0.1, over: 0.1 },
  gain: { under: 0.1, over: 0.5 },
};
export const SERVINGS = 5;  // bulk cooking: each recipe is eaten once a day, Monday to Friday
const SLOT_LABELS = { lunch: "Lunch", dinner: "Dinner" };

const round1 = (n) => Math.round(n * 10) / 10;
const toCents = (dollars) => Math.round(dollars * 100);
const dollars = (cents) => cents / 100;
const emptyTotals = () => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
const addInto = (a, b) => { for (const k of Object.keys(a)) a[k] += b[k]; };
const roundTotals = (t) => ({ kcal: Math.round(t.kcal), protein: round1(t.protein), carbs: round1(t.carbs), fat: round1(t.fat) });

function validateShape(plan, dailyTargets, weeklyBudget, goal) {
  const errors = [];
  if (!GOALS.includes(goal)) errors.push('Goal must be "lose", "maintain" or "gain".');
  if (!dailyTargets || !(dailyTargets.kcal > 0)) errors.push("Daily lunch-and-dinner target needs a positive kcal.");
  if (!(typeof weeklyBudget === "number" && weeklyBudget > 0)) errors.push("Weekly budget must be a positive number.");
  if (!plan || !Array.isArray(plan.days) || plan.days.length !== 5) {
    errors.push("Plan must have exactly 5 days.");
    return errors;
  }
  plan.days.forEach((d, i) => {
    for (const slot of SLOTS) {
      const m = d && d[slot];
      const where = `${DAY_NAMES[i]} ${slot}`;
      if (!m || typeof m.name !== "string" || !m.name.trim()) errors.push(`${where}: meal needs a name.`);
      else if (!Array.isArray(m.items) || m.items.length === 0) errors.push(`${where}: meal needs at least one ingredient.`);
      else if (m.items.some((it) => !it || typeof it !== "object")) errors.push(`${where}: each ingredient must be { ingredientId, grams }.`);
    }
  });
  return errors;
}

// dailyTargets: the `lunchDinner` object from calculateTargets (needs .kcal)
// Returns { ok: false, errors } if the plan is not even shaped right, otherwise { ok: true, ... , problems }.
// options.goal: "lose" | "maintain" | "gain" (default "maintain"); it sets how far a day may be from the calorie target.
// options.collapseDays: for identical days (bulk cooking). A problem is reported once, for "Each day" / "Lunch" / "Dinner",
//   instead of five times. The totals and shopping list still count all 5 days.
export function checkPlan(plan, dailyTargets, weeklyBudget, ingredientList = defaultIngredients, options = {}) {
  const goal = options.goal ?? "maintain";
  const collapse = options.collapseDays === true;
  const errors = validateShape(plan, dailyTargets, weeklyBudget, goal);
  if (errors.length) return { ok: false, errors };
  const limits = KCAL_LIMITS[goal];

  const byId = new Map(ingredientList.map((i) => [i.id, i]));
  const problems = [];
  const gramsNeeded = new Map(); // ingredientId -> total grams across the week (known ingredients only)
  const meals = [];
  const days = [];
  const weekTotals = emptyTotals();

  plan.days.forEach((d, dayIndex) => {
    const dayName = DAY_NAMES[dayIndex];
    const dayTotals = emptyTotals();
    const report = (problem) => { if (!collapse || dayIndex === 0) problems.push(problem); };

    for (const slot of SLOTS) {
      const meal = d[slot];
      const where = collapse ? SLOT_LABELS[slot] : `${dayName} ${slot}`;
      const mealTotals = emptyTotals();
      let mealCost = 0; // estimate only: the share of each pack this meal uses (see estCost below)
      const items = [];

      for (const it of meal.items) {
        const ing = byId.get(it.ingredientId);
        if (!ing) {
          report({ type: "unknown-ingredient", day: dayName, meal: slot, ingredientId: it.ingredientId,
            message: `${where} "${meal.name}": unknown ingredient "${it.ingredientId}" (ignored in the totals).` });
          continue;
        }
        if (typeof it.grams !== "number" || !Number.isFinite(it.grams) || it.grams <= 0) {
          report({ type: "bad-grams", day: dayName, meal: slot, ingredientId: it.ingredientId,
            message: `${where} "${meal.name}": grams for "${it.ingredientId}" must be a positive number.` });
          continue;
        }
        const f = it.grams / 100;
        const contrib = { kcal: ing.per100g.kcal * f, protein: ing.per100g.protein * f, carbs: ing.per100g.carbs * f, fat: ing.per100g.fat * f };
        addInto(mealTotals, contrib);
        mealCost += ing.pricing === "pack" ? (it.grams / ing.packGrams) * ing.price : (it.grams / 1000) * ing.price;
        gramsNeeded.set(ing.id, (gramsNeeded.get(ing.id) || 0) + it.grams);
        items.push({ ingredientId: ing.id, name: ing.name, grams: it.grams, kcal: round1(contrib.kcal),
          protein: round1(contrib.protein), carbs: round1(contrib.carbs), fat: round1(contrib.fat) });
      }

      addInto(dayTotals, mealTotals);
      // estCost is DISPLAY ONLY: grams used / pack size * price. You still pay for whole packs, so the meals'
      // estimates add up to less than the weekly total. The weekly cost below is the real (whole-pack) number.
      meals.push({ day: dayName, slot, name: meal.name, totals: roundTotals(mealTotals), estCost: dollars(toCents(mealCost)), items });
    }

    addInto(weekTotals, dayTotals);
    const diffPct = ((dayTotals.kcal - dailyTargets.kcal) / dailyTargets.kcal) * 100;
    days.push({ day: dayName, totals: roundTotals(dayTotals), targetKcal: dailyTargets.kcal, diffPct: round1(diffPct) });
    const under = (dailyTargets.kcal - dayTotals.kcal) / dailyTargets.kcal > limits.under;
    const over = (dayTotals.kcal - dailyTargets.kcal) / dailyTargets.kcal > limits.over;
    if (under || over) {
      const direction = under ? "under" : "over";
      const limitText = goal === "gain"
        ? (under ? "a gain plan may be at most 10% below" : "sanity limit is 50% above")
        : "limit 10%";
      report({ type: "day-calories", day: collapse ? "Every day" : dayName, kcal: Math.round(dayTotals.kcal), diffPct: round1(diffPct), direction,
        message: `${collapse ? "Each day" : dayName} is ${Math.round(dayTotals.kcal)} kcal, ${Math.abs(round1(diffPct))}% ${under ? "below" : "above"} the ${dailyTargets.kcal} kcal target (${limitText}).` });
    }
  });

  // Shopping list and weekly cost. Work in whole cents so the total always equals the sum of the lines.
  const shoppingList = [];
  let totalCents = 0;
  for (const [id, rawGrams] of gramsNeeded) {
    const ing = byId.get(id);
    const grams = Math.round(rawGrams * 100) / 100;
    let packs = null, costCents, leftoverGrams = 0;
    if (ing.pricing === "pack") {
      packs = Math.ceil(grams / ing.packGrams);
      costCents = toCents(packs * ing.price);
      leftoverGrams = Math.round((packs * ing.packGrams - grams) * 100) / 100;
    } else {
      costCents = toCents((grams / 1000) * ing.price); // "weight" prices are per 1000 g
    }
    totalCents += costCents;
    shoppingList.push({ ingredientId: id, name: ing.name, pricing: ing.pricing, grams, packs, packGrams: ing.packGrams, leftoverGrams, cost: dollars(costCents) });
  }

  const budgetCents = toCents(weeklyBudget);
  if (totalCents > budgetCents) {
    const overBy = dollars(totalCents - budgetCents);
    problems.push({ type: "over-budget", overBy,
      message: `Over budget by $${overBy.toFixed(2)} ($${dollars(totalCents).toFixed(2)} against $${weeklyBudget.toFixed(2)}).` });
  }

  return {
    ok: true,
    meals,
    days,
    week: { totals: roundTotals(weekTotals) },
    cost: { total: dollars(totalCents), budget: weeklyBudget, overBy: Math.max(0, dollars(totalCents - budgetCents)) },
    mealCostNote: "Per-meal costs are estimates (grams used / pack size x price). The weekly total counts whole packs.",
    shoppingList,
    problems,
    passes: problems.length === 0,
  };
}

// ---------------------------------------------------------------------------------------------
// Bulk cooking: two recipes (one serving each), cooked once and eaten Monday to Friday.
// ---------------------------------------------------------------------------------------------

// recipes = { lunch: Meal, dinner: Meal } -> a 5-day plan where every day is that lunch and that dinner.
export function expandRecipes(recipes) {
  return { days: DAY_NAMES.map((day) => ({ day, lunch: recipes.lunch, dinner: recipes.dinner })) };
}

function validateRecipes(recipes) {
  const errors = [];
  if (!recipes || typeof recipes !== "object") return ["Recipes are missing: need a lunch and a dinner."];
  for (const slot of SLOTS) {
    const m = recipes[slot];
    const label = SLOT_LABELS[slot];
    if (!m || typeof m !== "object") errors.push(`${label} recipe is missing.`);
    else if (typeof m.name !== "string" || !m.name.trim()) errors.push(`${label} recipe needs a name.`);
    else if (!Array.isArray(m.items) || m.items.length === 0) errors.push(`${label} recipe needs at least one ingredient.`);
    else if (m.items.some((it) => !it || typeof it !== "object")) errors.push(`${label} recipe: each ingredient must be { ingredientId, grams }.`);
  }
  return errors;
}

// Checks two bulk-cooked recipes. Same arguments and options as checkPlan.
// Returns { ok: false, errors } for badly shaped recipes, otherwise everything checkPlan returns plus:
//   plan:    the 5 identical days
//   recipes: { lunch, dinner }, each { slot, name, servings, totals, estCost, items } for ONE serving.
//            Each item has grams (one serving) and batchGrams (the whole batch, x5).
export function checkRecipes(recipes, dailyTargets, weeklyBudget, ingredientList = defaultIngredients, options = {}) {
  const errors = validateRecipes(recipes);
  if (errors.length) return { ok: false, errors };

  const plan = expandRecipes(recipes);
  const check = checkPlan(plan, dailyTargets, weeklyBudget, ingredientList, { ...options, collapseDays: true });
  if (!check.ok) return check;

  // Day 1 stands for every day, so its meals are the per-serving numbers.
  const describe = (meal) => ({
    slot: meal.slot,
    name: meal.name,
    servings: SERVINGS,
    totals: meal.totals,
    estCost: meal.estCost,
    items: meal.items.map((i) => ({ ...i, batchGrams: Math.round(i.grams * SERVINGS * 100) / 100 })),
  });
  const [lunch, dinner] = check.meals;
  return { ...check, plan, servings: SERVINGS, recipes: { lunch: describe(lunch), dinner: describe(dinner) } };
}
