// Stage 3: plan calculator and checker. Pure maths, no AI.
// The AI (later) only supplies meal names and { ingredientId, grams }. Everything else is worked out here from ingredients.js.
//
// plan = { days: [ { day: "Mon", lunch: Meal, dinner: Meal }, ... 5 days ] }
// Meal = { name: "Chicken rice bowl", items: [ { ingredientId: "rice", grams: 140 }, ... ] }

import { ingredients as defaultIngredients } from "./ingredients.js";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SLOTS = ["lunch", "dinner"];
const KCAL_TOLERANCE = 0.1; // a day may be up to 10% away from the lunch-and-dinner target
const MAX_REPEATS = 2;      // the same meal may appear at most twice

const round1 = (n) => Math.round(n * 10) / 10;
const toCents = (dollars) => Math.round(dollars * 100);
const dollars = (cents) => cents / 100;
const emptyTotals = () => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
const addInto = (a, b) => { for (const k of Object.keys(a)) a[k] += b[k]; };
const roundTotals = (t) => ({ kcal: Math.round(t.kcal), protein: round1(t.protein), carbs: round1(t.carbs), fat: round1(t.fat) });
const normaliseName = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");

function validateShape(plan, dailyTargets, weeklyBudget) {
  const errors = [];
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
export function checkPlan(plan, dailyTargets, weeklyBudget, ingredientList = defaultIngredients) {
  const errors = validateShape(plan, dailyTargets, weeklyBudget);
  if (errors.length) return { ok: false, errors };

  const byId = new Map(ingredientList.map((i) => [i.id, i]));
  const problems = [];
  const gramsNeeded = new Map(); // ingredientId -> total grams across the week (known ingredients only)
  const meals = [];
  const days = [];
  const weekTotals = emptyTotals();

  plan.days.forEach((d, dayIndex) => {
    const dayName = DAY_NAMES[dayIndex];
    const dayTotals = emptyTotals();

    for (const slot of SLOTS) {
      const meal = d[slot];
      const mealTotals = emptyTotals();
      const items = [];

      for (const it of meal.items) {
        const ing = byId.get(it.ingredientId);
        if (!ing) {
          problems.push({ type: "unknown-ingredient", day: dayName, meal: slot, ingredientId: it.ingredientId,
            message: `${dayName} ${slot} "${meal.name}": unknown ingredient "${it.ingredientId}" (ignored in the totals).` });
          continue;
        }
        if (typeof it.grams !== "number" || !Number.isFinite(it.grams) || it.grams <= 0) {
          problems.push({ type: "bad-grams", day: dayName, meal: slot, ingredientId: it.ingredientId,
            message: `${dayName} ${slot} "${meal.name}": grams for "${it.ingredientId}" must be a positive number.` });
          continue;
        }
        const f = it.grams / 100;
        const contrib = { kcal: ing.per100g.kcal * f, protein: ing.per100g.protein * f, carbs: ing.per100g.carbs * f, fat: ing.per100g.fat * f };
        addInto(mealTotals, contrib);
        gramsNeeded.set(ing.id, (gramsNeeded.get(ing.id) || 0) + it.grams);
        items.push({ ingredientId: ing.id, name: ing.name, grams: it.grams, kcal: round1(contrib.kcal),
          protein: round1(contrib.protein), carbs: round1(contrib.carbs), fat: round1(contrib.fat) });
      }

      addInto(dayTotals, mealTotals);
      meals.push({ day: dayName, slot, name: meal.name, totals: roundTotals(mealTotals), items,
        _signature: meal.items.map((it) => `${it.ingredientId}:${it.grams}`).sort().join(",") });
    }

    addInto(weekTotals, dayTotals);
    const diffPct = ((dayTotals.kcal - dailyTargets.kcal) / dailyTargets.kcal) * 100;
    days.push({ day: dayName, totals: roundTotals(dayTotals), targetKcal: dailyTargets.kcal, diffPct: round1(diffPct) });
    if (Math.abs(dayTotals.kcal - dailyTargets.kcal) / dailyTargets.kcal > KCAL_TOLERANCE) {
      problems.push({ type: "day-calories", day: dayName, kcal: Math.round(dayTotals.kcal), diffPct: round1(diffPct),
        message: `${dayName} is ${Math.round(dayTotals.kcal)} kcal, ${Math.abs(round1(diffPct))}% ${diffPct < 0 ? "below" : "above"} the ${dailyTargets.kcal} kcal target (limit 10%).` });
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

  // Repeats: two meals count as identical if they share a name (ignoring case/spacing) or the exact same ingredients and grams.
  const parent = meals.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < meals.length; i++) {
    for (let j = i + 1; j < meals.length; j++) {
      if (normaliseName(meals[i].name) === normaliseName(meals[j].name) || meals[i]._signature === meals[j]._signature) {
        parent[find(i)] = find(j);
      }
    }
  }
  const groups = new Map();
  meals.forEach((m, i) => { const r = find(i); groups.set(r, [...(groups.get(r) || []), m]); });
  for (const group of groups.values()) {
    if (group.length > MAX_REPEATS) {
      const where = group.map((m) => `${m.day} ${m.slot}`);
      problems.push({ type: "repeated-meal", name: group[0].name, count: group.length, where,
        message: `"${group[0].name}" is used ${group.length} times (${where.join(", ")}); the limit is ${MAX_REPEATS}.` });
    }
  }
  meals.forEach((m) => delete m._signature);

  return {
    ok: true,
    meals,
    days,
    week: { totals: roundTotals(weekTotals) },
    cost: { total: dollars(totalCents), budget: weeklyBudget, overBy: Math.max(0, dollars(totalCents - budgetCents)) },
    shoppingList,
    problems,
    passes: problems.length === 0,
  };
}
