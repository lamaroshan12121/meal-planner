// Run: node test-generate-plan.js
// Tests the AI loop with a FAKE askAI, so it never touches Gemini or your quota.
// BULK COOKING: the AI returns two recipes ({ lunch, dinner }); code expands them into 5 identical days.
// Fixture costs and problems are hand-checked in test-plan.js, at a 1,767 kcal target and a $65 budget:
//   goodRecipes = $38.98, no problems.  salmonRecipes = $84.38, so $19.38 over.  messyRecipes = unknown ingredient + a 921 kcal day.
import { generatePlan, buildPrompt, planSchema } from "./generatePlan.js";
import { createHandler } from "./api/plan.js";
import { ingredients } from "./ingredients.js";
import { TARGET, goodRecipes, salmonRecipes, messyRecipes } from "./test-fixtures.js";

let failed = 0;
const eq = (label, got, want) => { if (got !== want) { failed++; console.log(`FAIL ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); } };
const near = (label, got, want, tol = 0.001) => { if (Math.abs(got - want) > tol) { failed++; console.log(`FAIL ${label}: got ${got}, want ${want}`); } };

// A fake AI: answers with each item in `answers` in turn (a function is called, an Error is thrown). Records every prompt.
function fakeAI(answers) {
  const prompts = [];
  const askAI = async (prompt) => {
    prompts.push(prompt);
    const a = answers[Math.min(prompts.length - 1, answers.length - 1)];
    if (a instanceof Error) throw a;
    return typeof a === "function" ? a() : a;
  };
  return { askAI, prompts };
}
const run = (answers, opts = {}) => {
  const ai = fakeAI(answers);
  return generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai.askAI, ...opts }).then((r) => ({ r, ai }));
};

// ---- (a) passes first time: 1 call, no retry ----
{
  const { r, ai } = await run([goodRecipes()]);
  eq("a ok", r.ok, true);
  eq("a attempts", r.attempts, 1);
  eq("a calls", ai.prompts.length, 1);
  eq("a passes", r.passes, true);
  near("a cost", r.check.cost.total, 38.98);
  eq("a no problems", r.check.problems.length, 0);
  eq("a returns the AI's recipes", r.recipes.lunch.name, "Chicken rice bowl");
  eq("a check expands to 5 days", r.check.days.length, 5);
}

// ---- (b) fails (over budget by $19.38), then passes on the retry ----
{
  const { r, ai } = await run([salmonRecipes(), goodRecipes()]);
  eq("b ok", r.ok, true);
  eq("b attempts", r.attempts, 2);
  eq("b calls", ai.prompts.length, 2);
  eq("b passes", r.passes, true);
  near("b final cost", r.check.cost.total, 38.98);
  eq("b retry prompt says over budget by $19.38", ai.prompts[1].includes("Over budget by $19.38"), true);
  eq("b retry prompt asks for cheaper ingredients", ai.prompts[1].includes("cheaper"), true);
  eq("b retry prompt names the most expensive item", ai.prompts[1].includes("salmon ($79.90)"), true);
  eq("b retry prompt includes the previous recipes", ai.prompts[1].includes("Salmon and rice"), true);
  eq("b first prompt has no problems section", ai.prompts[0].includes("had problems"), false);
  eq("b history has 2 attempts", r.history.length, 2);
}

// ---- (c) still fails after 2 retries: 3 calls, recipes returned anyway with the over-budget problem ----
{
  const { r, ai } = await run([salmonRecipes()]);
  eq("c ok (recipes still returned)", r.ok, true);
  eq("c attempts", r.attempts, 3);
  eq("c calls (1 + 2 retries, never more)", ai.prompts.length, 3);
  eq("c passes", r.passes, false);
  eq("c problem type", r.check.problems.map((p) => p.type).join(), "over-budget");
  near("c overBy", r.check.cost.overBy, 19.38);
  eq("c 3rd prompt still reports the problem", ai.prompts[2].includes("Over budget by $19.38"), true);
}

// ---- Other behaviour ----
{
  const { r, ai } = await run([salmonRecipes()], { maxRetries: 0 });
  eq("maxRetries 0 -> 1 call", ai.prompts.length, 1);
  eq("maxRetries 0 still returns recipes", r.ok && !r.passes, true);
}
{
  // A badly shaped answer (no dinner) is retried and can recover
  const { r, ai } = await run([{ lunch: goodRecipes().lunch }, goodRecipes()]);
  eq("shape: recovered", r.ok && r.passes, true);
  eq("shape: attempts", r.attempts, 2);
  eq("shape: retry prompt explains", ai.prompts[1].includes("Dinner recipe is missing"), true);
}
{
  // The old 5-day shape is not accepted
  const { r } = await run([{ days: [] }]);
  eq("badshape: not ok", r.ok, false);
  eq("badshape: error text", r.error.includes("not in the right shape"), true);
  eq("badshape: attempts", r.attempts, 3);
}
{
  // Unknown ingredient is sent back; repeats are NOT mentioned
  const { r, ai } = await run([messyRecipes(), goodRecipes()]);
  eq("messy: recovered", r.passes, true);
  eq("messy: prompt mentions unknown id", ai.prompts[1].includes('unknown ingredient "wagyu-beef"'), true);
  eq("messy: prompt mentions the off-target day", ai.prompts[1].includes("Each day is 921 kcal"), true);
  eq("messy: no talk of repeats", /repeat|twice/i.test(ai.prompts[1]), false);
}
{
  // With several bad attempts, the one with the fewest problems wins (messy has 2 problems, salmon has 1)
  const { r, ai } = await run([messyRecipes(), salmonRecipes(), messyRecipes()]);
  eq("best-of: calls", ai.prompts.length, 3);
  eq("best-of: returns the 1-problem recipes", r.check.problems.length, 1);
}
{
  const { r, ai } = await run([new Error("429 quota exceeded")]);
  eq("fail: not ok", r.ok, false);
  eq("fail: message", r.error.includes("429 quota exceeded"), true);
  eq("fail: one call only", ai.prompts.length, 1);
}
{
  const { r } = await run([salmonRecipes(), new Error("network down")]);
  eq("retryfail: ok with earlier recipes", r.ok, true);
  eq("retryfail: has over-budget", r.check.problems[0].type, "over-budget");
  eq("retryfail: error kept", r.retryError.includes("network down"), true);
}
eq("no askAI", (await generatePlan({ targets: TARGET, budget: 65, goal: "maintain" })).ok, false);
eq("bad budget", (await generatePlan({ targets: TARGET, budget: -1, goal: "maintain", askAI: async () => goodRecipes() })).ok, false);
eq("bad targets", (await generatePlan({ targets: {}, budget: 65, goal: "maintain", askAI: async () => goodRecipes() })).ok, false);
eq("generatePlan needs a valid goal", (await generatePlan({ targets: TARGET, budget: 65, goal: "bulk", askAI: async () => goodRecipes() })).ok, false);
eq("generatePlan needs a goal", (await generatePlan({ targets: TARGET, budget: 65, askAI: async () => goodRecipes() })).ok, false);

// ---- The prompt: bulk cooking, targets, budget, every ingredient, and the rules ----
{
  const p = buildPrompt({ targets: TARGET, budget: 65, goal: "maintain" });
  eq("prompt has kcal target", p.includes("1767 kcal"), true);
  eq("prompt: roughly half each (884)", p.includes("roughly 884 kcal for the lunch serving and 884 kcal for the dinner serving"), true);
  eq("prompt has protein target", p.includes("67 g protein"), true);
  eq("prompt has budget", p.includes("$65"), true);
  for (const i of ingredients) eq(`prompt lists ${i.id}`, p.includes(`"${i.id}"`), true);
  eq("prompt: two recipes", p.includes("exactly TWO recipes"), true);
  eq("prompt: one serving each", p.includes("ONE serving"), true);
  eq("prompt: cooked in bulk, Monday to Friday", p.includes("cooked in bulk") && p.includes("Monday to Friday"), true);
  eq("prompt: keep well", p.includes("keep well in the fridge"), true);
  eq("prompt: shopping is for 5 servings", p.includes("5 servings of each recipe"), true);
  eq("prompt: dry weight", p.includes("DRY weight"), true);
  eq("prompt: only these ids", p.includes("ONLY the ingredient ids"), true);
  eq("prompt: no numbers from AI", p.includes("Do NOT give calories, macros or prices"), true);
  eq("prompt: asks for lunch and dinner JSON", p.includes('{ "lunch": {') && p.includes('"dinner": {'), true);
  eq("prompt: no twice-a-week rule", /twice/i.test(p), false);
  eq("prompt: no days array", p.includes('"days"'), false);
}

// ---- The schema lets the AI return only recipe names, ids and grams ----
{
  const keys = new Set();
  const walk = (o) => { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { keys.add(k); walk(v); } };
  walk(planSchema);
  for (const banned of ["kcal", "calories", "protein", "carbs", "fat", "price", "cost", "days", "day"]) eq(`schema has no ${banned}`, keys.has(banned), false);
  for (const wanted of ["lunch", "dinner", "name", "items", "ingredientId", "grams"]) eq(`schema has ${wanted}`, keys.has(wanted), true);
  eq("schema requires lunch and dinner", planSchema.required.join(), "lunch,dinner");
}

// ---- Goal-dependent calories (a day = one lunch serving + one dinner serving = 1775.4 kcal for goodRecipes) ----
// Only the instructions added by the retry (not the echoed previous recipes).
const retrySection = (prompt) => prompt.slice(prompt.indexOf("had problems"), prompt.indexOf("Previous recipes:"));
{
  // Target 1300: the day is +36.6% over.
  const gain = await run([goodRecipes()], { targets: { ...TARGET, kcal: 1300 }, goal: "gain" });
  eq("gain 35% over: passes first time", gain.r.passes, true);
  eq("gain 35% over: 1 call", gain.ai.prompts.length, 1);

  const maint = await run([goodRecipes()], { targets: { ...TARGET, kcal: 1300 }, goal: "maintain" });
  eq("maintain 35% over: fails", maint.r.passes, false);
  eq("maintain 35% over: 3 calls", maint.ai.prompts.length, 3);
  eq("maintain 35% over: ONE day problem (not five)", maint.r.check.problems.filter((p) => p.type === "day-calories").length, 1);
  eq("maintain 35% over: retry prompt says above target", maint.ai.prompts[1].includes("Each day is 1775 kcal, 36.6% above the 1300 kcal target"), true);
}
{
  // Target 2000, gain: 1775.4 is 11.2% under. The retry must ask for MORE calories, never fewer.
  const { ai } = await run([goodRecipes()], { targets: { ...TARGET, kcal: 2000 }, goal: "gain" });
  const retry = retrySection(ai.prompts[1]);
  eq("gain under: asks to add calories", retry.includes("Add calories (bigger portions or calorie-dense ingredients)"), true);
  eq("gain under: names the minimum (90% of 2000 = 1800)", retry.includes("at least 1800 kcal"), true);
  for (const banned of ["Cut calories", "smaller amounts", "reduce", "Reduce", "fewer calories", "lower"]) {
    eq(`gain under: retry text does not say "${banned}"`, retry.includes(banned), false);
  }
}
{
  // Over budget on a gain plan: cheaper ingredients but keep calories up (no "smaller amounts").
  const { ai } = await run([salmonRecipes()], { goal: "gain" });
  const retry = retrySection(ai.prompts[1]);
  eq("gain over budget: cheaper ingredients", retry.includes("Use cheaper ingredients, but keep calories up"), true);
  eq("gain over budget: minimum 1591", retry.includes("at least 1591 kcal"), true);
  eq("gain over budget: no smaller amounts", retry.includes("smaller amounts"), false);
  eq("gain over budget: still says over budget by $19.38", retry.includes("Over budget by $19.38"), true);

  const ai2 = (await run([salmonRecipes()], { goal: "maintain" })).ai;
  eq("maintain over budget: smaller amounts allowed", retrySection(ai2.prompts[1]).includes("cheaper ingredients or smaller amounts"), true);
}
{
  // Target 1100, gain: the day is +61%, beyond the 50% sanity limit, so the retry may ask to cut (down to 1650 at most).
  const { ai } = await run([goodRecipes()], { targets: { ...TARGET, kcal: 1100 }, goal: "gain" });
  const retry = retrySection(ai.prompts[1]);
  eq("gain over limit: asks to cut only because over the limit", retry.includes("Cut calories only because the day is over the 1650 kcal limit"), true);
  eq("gain over limit: keeps the floor (990)", retry.includes("at or above 990 kcal"), true);
  eq("gain over limit: does not ask to add", retry.includes("Add calories"), false);
}
{
  const g = buildPrompt({ targets: TARGET, budget: 65, goal: "gain" });
  eq("gain prompt: says GAIN", g.includes("GAIN weight"), true);
  eq("gain prompt: minimum 1591 and maximum 2650", g.includes("at least 1591 kcal") && g.includes("no more than 2650 kcal"), true);
  eq("gain prompt: does not say within 10%", g.includes("within 10%"), false);
  for (const goal of ["maintain", "lose"]) {
    const p = buildPrompt({ targets: TARGET, budget: 65, goal });
    eq(`${goal} prompt: within 10%`, p.includes("(within 10%)"), true);
    eq(`${goal} prompt: not told to gain`, p.includes("GAIN"), false);
  }
}

// ---- The handler (api/plan.js), with a fake AI ----
const mockRes = () => {
  const res = { code: 200, body: null };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
};
// The Stage 2 example person: 57 kg, 175.3 cm, 22, male, moderate, gain -> lunch+dinner 1767 kcal, 67 g protein
const profile = { weightKg: 57, heightCm: 175.3, age: 22, sex: "male", activity: "moderate", goal: "gain" };
{
  const ai = fakeAI([goodRecipes()]);
  const handler = createHandler(ai.askAI);

  let res = mockRes(); await handler({ method: "GET" }, res);
  eq("handler GET -> 405", res.code, 405);

  res = mockRes(); await handler({ method: "POST", body: {} }, res);
  eq("handler no profile -> 400", res.code, 400);

  res = mockRes(); await handler({ method: "POST", body: { profile: { ...profile, weightKg: 5 } } }, res);
  eq("handler bad profile -> 400", res.code, 400);
  eq("handler bad profile lists errors", res.body.details[0].includes("Weight"), true);

  res = mockRes(); await handler({ method: "POST", body: { profile, budget: "lots" } }, res);
  eq("handler bad budget -> 400", res.code, 400);
  eq("handler made no AI calls for bad input", ai.prompts.length, 0);

  res = mockRes(); await handler({ method: "POST", body: { profile, budget: 65 } }, res);
  const b = res.body;
  eq("handler success -> 200", res.code, 200);
  eq("handler targets lunch+dinner kcal", b.targets.lunchDinner.kcal, 1767);
  eq("handler attempts", b.attempts, 1);
  eq("handler passes", b.passes, true);
  eq("handler returns the two recipes", `${b.recipes.lunch.name} / ${b.recipes.dinner.name}`, "Chicken rice bowl / Beef pasta");
  eq("handler recipes hold only names, ids and grams", JSON.stringify(b.recipes).includes("kcal") || JSON.stringify(b.recipes).includes("cost"), false);
  eq("handler returns 5 days", b.plan.days.length, 5);
  eq("handler days are Mon to Fri", b.plan.days.map((d) => d.day).join(), "Mon,Tue,Wed,Thu,Fri");
  eq("handler days repeat the same meals", b.plan.days.every((d) => d.lunch.name === "Chicken rice bowl" && d.dinner.name === "Beef pasta"), true);
  eq("handler servings", b.servings, 5);
  near("handler cost", b.check.cost.total, 38.98);
  eq("handler per-serving lunch kcal", b.check.recipes.lunch.totals.kcal, 901);
  eq("handler shopping list", b.shoppingList.length, 6);
  eq("handler shopping list is the check's", b.shoppingList, b.check.shoppingList);
  eq("handler prompt used the calculated target", ai.prompts[0].includes("1767 kcal"), true);

  res = mockRes(); await handler({ method: "POST", body: { profile } }, res);
  eq("handler default budget is 65", res.body.check.cost.budget, 65);
  eq("handler gain prompt mentions gaining", ai.prompts[0].includes("GAIN weight"), true);
}
{
  // The profile's goal reaches the checker. Same body (60 kg, 170 cm, 25 y, male, light):
  //   BMR = 600 + 1062.5 - 125 + 5 = 1542.5, maintenance = 1542.5 * 1.375 = 2120.9 kcal
  //   maintain: lunch+dinner = 65% of 2120.9 = 1378.6 -> a day of 1775.4 is +28.8%: fails the 10% rule
  //   gain: (2120.9 + 300) * 0.65 = 1573.6 -> 1574 -> a day of 1775.4 is +12.8%: fine for a gain plan
  const body = { weightKg: 60, heightCm: 170, age: 25, sex: "male", activity: "light" };
  const gainRes = mockRes();
  await createHandler(fakeAI([goodRecipes()]).askAI)({ method: "POST", body: { profile: { ...body, goal: "gain" }, budget: 65 } }, gainRes);
  eq("handler gain lunch+dinner kcal", gainRes.body.targets.lunchDinner.kcal, 1574);
  eq("handler gain: recipes pass", gainRes.body.passes, true);
  eq("handler gain: 1 attempt", gainRes.body.attempts, 1);

  const maintRes = mockRes();
  await createHandler(fakeAI([goodRecipes()]).askAI)({ method: "POST", body: { profile: { ...body, goal: "maintain" }, budget: 65 } }, maintRes);
  eq("handler maintain lunch+dinner kcal", maintRes.body.targets.lunchDinner.kcal, 1379);
  eq("handler maintain: same recipes fail", maintRes.body.passes, false);
  eq("handler maintain: 3 attempts", maintRes.body.attempts, 3);
}
{
  const handler = createHandler(fakeAI([salmonRecipes()]).askAI);
  const res = mockRes(); await handler({ method: "POST", body: { profile, budget: 65 } }, res);
  eq("handler over budget -> still 200", res.code, 200);
  eq("handler over budget attempts", res.body.attempts, 3);
  eq("handler over budget passes false", res.body.passes, false);
  near("handler over budget overBy", res.body.check.cost.overBy, 19.38);
}
{
  const handler = createHandler(fakeAI([new Error("boom")]).askAI);
  const res = mockRes(); await handler({ method: "POST", body: { profile, budget: 65 } }, res);
  eq("handler AI failure -> 502", res.code, 502);
  eq("handler AI failure has a message", typeof res.body.error, "string");
}

console.log(failed ? `${failed} check(s) failed` : "OK: all generate-plan tests passed");
process.exit(failed ? 1 : 0);
