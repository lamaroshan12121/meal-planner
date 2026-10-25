// Stage 4: ask the AI for two recipes, check them with code, and send problems back for up to 2 retries.
// BULK COOKING: the AI designs ONE lunch and ONE dinner (one serving each). Code expands them into 5 identical days.
// The AI is passed in as `askAI(prompt) -> recipes object`, so tests can use a fake one. The real one is in gemini.js.
// The AI only ever returns recipe names, ingredient ids and grams. Every calorie, macro and dollar comes from plan.js.

import { checkRecipes, GOALS, KCAL_LIMITS, SERVINGS } from "./plan.js";
import { ingredients as defaultIngredients, PRICES_CHECKED } from "./ingredients.js";

// What the AI is allowed to return: names, ids and grams. No calories, macros or prices.
const mealSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { ingredientId: { type: "string" }, grams: { type: "number" } },
        required: ["ingredientId", "grams"],
      },
    },
  },
  required: ["name", "items"],
};

export const planSchema = {
  type: "object",
  properties: { lunch: mealSchema, dinner: mealSchema },
  required: ["lunch", "dinner"],
};

// Lowest and highest daily kcal a gain plan may have (the tiny offset guards against float noise like 1710.0000000000002).
const gainMin = (kcal) => Math.ceil(kcal * (1 - KCAL_LIMITS.gain.under) - 1e-9);
const gainMax = (kcal) => Math.floor(kcal * (1 + KCAL_LIMITS.gain.over) + 1e-9);

// The calorie wording depends on the goal. Gain: a day may go over (up to a 50% sanity limit) but not under by more than 10%.
// The day is the lunch serving plus the dinner serving, so each serving aims for about half.
function calorieLines(targets, goal) {
  const half = Math.round(targets.kcal / 2);
  if (goal === "gain") {
    const min = gainMin(targets.kcal);
    const max = gainMax(targets.kcal);
    return {
      target: `- About ${targets.kcal} kcal per day, so roughly ${half} kcal for the lunch serving and ${half} kcal for the dinner serving. This person wants to GAIN weight, so going over is fine.`,
      rule: `- One lunch serving plus one dinner serving must be at least ${min} kcal (no more than 10% under ${targets.kcal}) and no more than ${max} kcal. Use the per100g nutrition below to pick grams.`,
    };
  }
  return {
    target: `- About ${targets.kcal} kcal per day, so roughly ${half} kcal for the lunch serving and ${half} kcal for the dinner serving`,
    rule: `- Pick grams so one lunch serving plus one dinner serving lands close to ${targets.kcal} kcal (within 10%), using the per100g nutrition below.`,
  };
}

export function buildPrompt({ targets, budget, goal = "maintain", ingredientList = defaultIngredients }) {
  const cal = calorieLines(targets, goal);
  const list = ingredientList.map((i) => ({
    id: i.id,
    name: i.name,
    packGrams: i.packGrams,
    price: i.price,
    pricing: i.pricing,
    state: i.state || "raw / as bought",
    per100g: i.per100g,
  }));

  return `You are a meal prep planner for one person on a budget. Design exactly TWO recipes: one lunch and one dinner.

Each recipe is for ONE serving. They will be cooked in bulk, once, as ${SERVINGS} servings each, and the same lunch and the same dinner will be eaten every day from Monday to Friday. Choose meals that keep well in the fridge for several days and reheat well.

Targets (one lunch serving plus one dinner serving, which is one day):
${cal.target}
- At least ${targets.protein} g protein
Weekly grocery budget: $${budget} AUD for the whole week (shopping prices from ALDI, checked ${PRICES_CHECKED}). The shopping is for ${SERVINGS} servings of each recipe, so every gram you list is bought ${SERVINGS} times over.

Rules:
- Use ONLY the ingredient ids in the list below. Any other id is rejected.
- Rice, pasta and red lentils are DRY weight in grams (their nutrition is for the dry product). All other grams are as bought / raw.
- Each recipe is a name plus a list of { ingredientId, grams } for one serving. Give grams as whole numbers. Do NOT give calories, macros or prices; code works those out.
- Keep the whole week within the budget. Items with pricing "pack" are bought in whole packs (packGrams for the price), so choose amounts where ${SERVINGS} servings use most of a pack and the two recipes share ingredients where that helps. Items with pricing "weight" cost price per 1000 g, only for the grams you use.
- Prefer simple meals that are easy to cook in one big batch.
${cal.rule}

Ingredients (nutrition per 100 g):
${JSON.stringify(list, null, 1)}

Return the recipes as JSON: { "lunch": { "name": "...", "items": [ { "ingredientId": "...", "grams": 0 } ] }, "dinner": { "name": "...", "items": [ ... ] } }`;
}

// A follow-up prompt for a retry: the original instructions, the last answer, and what code found wrong with it.
export function buildRetryPrompt({ basePrompt, previousRecipes, check, targets, goal = "maintain" }) {
  const lines = check.ok ? check.problems.map((p) => `- ${p.message}`) : check.errors.map((e) => `- ${e}`);
  const hints = [];
  const has = (type, direction) => check.ok && check.problems.some((p) => p.type === type && (!direction || p.direction === direction));
  const isGain = goal === "gain";

  if (has("over-budget")) {
    const top = [...check.shoppingList].sort((a, b) => b.cost - a.cost).slice(0, 3);
    const expensive = `The most expensive items for the week were: ${top.map((l) => `${l.ingredientId} ($${l.cost.toFixed(2)})`).join(", ")}.`;
    // On a gain plan, never suggest smaller portions: calories must stay up.
    hints.push(isGain
      ? `Use cheaper ingredients, but keep calories up: one lunch plus one dinner must still reach at least ${gainMin(targets.kcal)} kcal. ${expensive}`
      : `Use cheaper ingredients or smaller amounts. ${expensive}`);
  }
  if (isGain && has("day-calories", "under")) {
    hints.push(`Add calories (bigger portions or calorie-dense ingredients) so one lunch plus one dinner reaches at least ${gainMin(targets.kcal)} kcal.`);
  }
  if (isGain && has("day-calories", "over")) {
    hints.push(`Cut calories only because the day is over the ${gainMax(targets.kcal)} kcal limit, and keep it at or above ${gainMin(targets.kcal)} kcal.`);
  }
  return `${basePrompt}

---
Your previous recipes were checked by code and had problems:
${lines.join("\n")}
${hints.join("\n")}

Previous recipes:
${JSON.stringify(previousRecipes)}

Fix these problems and return the corrected lunch and dinner recipes in the same JSON format.`;
}

// targets: the lunchDinner object from calculateTargets. budget: weekly dollars. goal: "lose" | "maintain" | "gain".
// Returns { ok: true, recipes, check, attempts, passes, history } (the recipes may still have problems; see check.problems),
// or { ok: false, error, attempts } if the AI call failed or never gave usable recipes.
export async function generatePlan({ targets, budget, goal, askAI, maxRetries = 2, ingredientList = defaultIngredients }) {
  if (typeof askAI !== "function") return { ok: false, error: "No AI function provided.", attempts: 0 };
  if (!targets || !(targets.kcal > 0)) return { ok: false, error: "Targets need a positive kcal.", attempts: 0 };
  if (!(typeof budget === "number" && budget > 0)) return { ok: false, error: "Budget must be a positive number.", attempts: 0 };
  if (!GOALS.includes(goal)) return { ok: false, error: 'Goal must be "lose", "maintain" or "gain".', attempts: 0 };

  const basePrompt = buildPrompt({ targets, budget, goal, ingredientList });
  let prompt = basePrompt;
  let best = null;       // best attempt with correctly shaped recipes: { recipes, check }
  let last = null;       // most recent attempt, shaped or not
  let retryError = null; // set if a retry's AI call failed after we already had recipes
  const history = [];
  let attempts = 0;

  for (let i = 0; i <= maxRetries; i++) {
    attempts++;
    let recipes;
    try {
      recipes = await askAI(prompt);
    } catch (err) {
      const msg = `The AI call failed: ${err?.message || err}`;
      if (best) { retryError = msg; break; }
      return { ok: false, error: msg, attempts };
    }
    if (!recipes || typeof recipes !== "object") {
      const msg = "The AI did not return recipes.";
      if (best) { retryError = msg; break; }
      return { ok: false, error: msg, attempts };
    }

    const check = checkRecipes(recipes, targets, budget, ingredientList, { goal });
    last = { recipes, check };
    history.push({ attempt: attempts, problems: check.ok ? check.problems.map((p) => p.message) : check.errors });

    if (check.ok && (!best || check.problems.length <= best.check.problems.length)) best = last;
    if (check.ok && check.passes) break;
    if (i < maxRetries) prompt = buildRetryPrompt({ basePrompt, previousRecipes: recipes, check, targets, goal });
  }

  if (!best) {
    return { ok: false, error: `The AI recipes were not in the right shape: ${last.check.errors.join(" ")}`, attempts, history };
  }
  return { ok: true, recipes: best.recipes, check: best.check, attempts, passes: best.check.passes, history, ...(retryError && { retryError }) };
}
