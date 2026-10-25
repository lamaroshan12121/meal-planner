// Stage 4: ask the AI for a plan, check it with code, and send problems back for up to 2 retries.
// The AI is passed in as `askAI(prompt) -> plan object`, so tests can use a fake one. The real one is in gemini.js.
// The AI only ever returns meal names, ingredient ids and grams. Every calorie, macro and dollar comes from plan.js.

import { checkPlan } from "./plan.js";
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
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        properties: { day: { type: "string" }, lunch: mealSchema, dinner: mealSchema },
        required: ["day", "lunch", "dinner"],
      },
    },
  },
  required: ["days"],
};

export function buildPrompt({ targets, budget, ingredientList = defaultIngredients }) {
  const list = ingredientList.map((i) => ({
    id: i.id,
    name: i.name,
    packGrams: i.packGrams,
    price: i.price,
    pricing: i.pricing,
    state: i.state || "raw / as bought",
    per100g: i.per100g,
  }));

  return `You are a meal prep planner for one person on a budget. Build a 5-day plan (Monday to Friday) with one lunch and one dinner each day.

Targets (for lunch and dinner COMBINED each day):
- About ${targets.kcal} kcal
- At least ${targets.protein} g protein
Weekly grocery budget: $${budget} AUD (shopping prices from ALDI, checked ${PRICES_CHECKED}).

Rules:
- Use ONLY the ingredient ids in the list below. Any other id is rejected.
- Rice, pasta and red lentils are DRY weight in grams (their nutrition is for the dry product). All other grams are as bought / raw.
- Each meal is a name plus a list of { ingredientId, grams }. Give grams as whole numbers. Do NOT give calories, macros or prices; code works those out.
- No meal may appear more than twice in the week, and meals must not repeat the same ingredients and grams under different names.
- Keep the whole week within the budget. Items with pricing "pack" are bought in whole packs (packGrams for the price), so reusing the same ingredients across meals wastes less. Items with pricing "weight" cost price per 1000 g, only for the grams you use.
- Prefer simple meals that can be cooked in batches.
- Pick grams so each day's lunch plus dinner lands close to ${targets.kcal} kcal (within 10%), using the per100g nutrition below.

Ingredients (nutrition per 100 g):
${JSON.stringify(list, null, 1)}

Return the plan as JSON: { "days": [ { "day": "Mon", "lunch": { "name": "...", "items": [ { "ingredientId": "...", "grams": 0 } ] }, "dinner": { ... } }, ...5 days ] }`;
}

// A follow-up prompt for a retry: the original instructions, the last answer, and what code found wrong with it.
export function buildRetryPrompt({ basePrompt, previousPlan, check }) {
  const lines = check.ok ? check.problems.map((p) => `- ${p.message}`) : check.errors.map((e) => `- ${e}`);
  const hints = [];
  if (check.ok && check.problems.some((p) => p.type === "over-budget")) {
    const top = [...check.shoppingList].sort((a, b) => b.cost - a.cost).slice(0, 3);
    hints.push(
      `Use cheaper ingredients or smaller amounts. The most expensive items were: ${top.map((l) => `${l.ingredientId} ($${l.cost.toFixed(2)})`).join(", ")}.`
    );
  }
  return `${basePrompt}

---
Your previous plan was checked by code and had problems:
${lines.join("\n")}
${hints.join("\n")}

Previous plan:
${JSON.stringify(previousPlan)}

Fix these problems and return the full corrected plan in the same JSON format.`;
}

// targets: the lunchDinner object from calculateTargets. budget: weekly dollars.
// Returns { ok: true, plan, check, attempts, passes, history } (plan may still have problems; see check.problems),
// or { ok: false, error, attempts } if the AI call failed or never gave a usable plan.
export async function generatePlan({ targets, budget, askAI, maxRetries = 2, ingredientList = defaultIngredients }) {
  if (typeof askAI !== "function") return { ok: false, error: "No AI function provided.", attempts: 0 };
  if (!targets || !(targets.kcal > 0)) return { ok: false, error: "Targets need a positive kcal.", attempts: 0 };
  if (!(typeof budget === "number" && budget > 0)) return { ok: false, error: "Budget must be a positive number.", attempts: 0 };

  const basePrompt = buildPrompt({ targets, budget, ingredientList });
  let prompt = basePrompt;
  let best = null;       // best attempt with a correctly shaped plan: { plan, check }
  let last = null;       // most recent attempt, shaped or not
  let retryError = null; // set if a retry's AI call failed after we already had a plan
  const history = [];
  let attempts = 0;

  for (let i = 0; i <= maxRetries; i++) {
    attempts++;
    let plan;
    try {
      plan = await askAI(prompt);
    } catch (err) {
      const msg = `The AI call failed: ${err?.message || err}`;
      if (best) { retryError = msg; break; }
      return { ok: false, error: msg, attempts };
    }
    if (!plan || typeof plan !== "object") {
      const msg = "The AI did not return a plan object.";
      if (best) { retryError = msg; break; }
      return { ok: false, error: msg, attempts };
    }

    const check = checkPlan(plan, targets, budget, ingredientList);
    last = { plan, check };
    history.push({ attempt: attempts, problems: check.ok ? check.problems.map((p) => p.message) : check.errors });

    if (check.ok && (!best || check.problems.length <= best.check.problems.length)) best = last;
    if (check.ok && check.passes) break;
    if (i < maxRetries) prompt = buildRetryPrompt({ basePrompt, previousPlan: plan, check });
  }

  if (!best) {
    return { ok: false, error: `The AI plan was not in the right shape: ${last.check.errors.join(" ")}`, attempts, history };
  }
  return { ok: true, plan: best.plan, check: best.check, attempts, passes: best.check.passes, history, ...(retryError && { retryError }) };
}
