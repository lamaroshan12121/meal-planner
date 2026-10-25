// Run: node test-generate-plan.js
// Tests the AI loop with a FAKE askAI, so it never touches Gemini or your quota.
// Fixture plans and their costs/problems are hand-checked in test-plan.js:
//   goodPlan = $49.84 with no problems, salmonPlan = $92.15 (over a $65 budget by $27.15), messyPlan = 3 problems.
import { generatePlan, buildPrompt, planSchema } from "./generatePlan.js";
import { createHandler } from "./api/plan.js";
import { ingredients } from "./ingredients.js";
import { TARGET, goodPlan, salmonPlan, messyPlan } from "./test-fixtures.js";

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

// ---- (a) passes first time: 1 call, no retry ----
{
  const ai = fakeAI([goodPlan()]);
  const r = await generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai.askAI });
  eq("a ok", r.ok, true);
  eq("a attempts", r.attempts, 1);
  eq("a calls", ai.prompts.length, 1);
  eq("a passes", r.passes, true);
  near("a cost", r.check.cost.total, 49.84);
  eq("a no problems", r.check.problems.length, 0);
}

// ---- (b) fails (over budget by $27.15), then passes on the retry ----
{
  const ai = fakeAI([salmonPlan(), goodPlan()]);
  const r = await generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai.askAI });
  eq("b ok", r.ok, true);
  eq("b attempts", r.attempts, 2);
  eq("b calls", ai.prompts.length, 2);
  eq("b passes", r.passes, true);
  near("b final cost", r.check.cost.total, 49.84);
  eq("b retry prompt says over budget by $27.15", ai.prompts[1].includes("Over budget by $27.15"), true);
  eq("b retry prompt asks for cheaper ingredients", ai.prompts[1].includes("cheaper"), true);
  eq("b retry prompt names the most expensive item", ai.prompts[1].includes("salmon ($79.90)"), true);
  eq("b retry prompt includes the previous plan", ai.prompts[1].includes("Salmon and rice"), true);
  eq("b first prompt has no problems section", ai.prompts[0].includes("had problems"), false);
  eq("b history has 2 attempts", r.history.length, 2);
}

// ---- (c) still fails after 2 retries: 3 calls, plan returned anyway with the over-budget problem ----
{
  const ai = fakeAI([salmonPlan()]);
  const r = await generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai.askAI });
  eq("c ok (plan still returned)", r.ok, true);
  eq("c attempts", r.attempts, 3);
  eq("c calls (1 + 2 retries, never more)", ai.prompts.length, 3);
  eq("c passes", r.passes, false);
  eq("c problem type", r.check.problems.map((p) => p.type).join(), "over-budget");
  near("c overBy", r.check.cost.overBy, 27.15);
  eq("c 3rd prompt still reports the problem", ai.prompts[2].includes("Over budget by $27.15"), true);
}

// ---- Other behaviour ----
// Retries are capped by maxRetries (0 means a single call)
{
  const ai = fakeAI([salmonPlan()]);
  const r = await generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai.askAI, maxRetries: 0 });
  eq("maxRetries 0 -> 1 call", ai.prompts.length, 1);
  eq("maxRetries 0 still returns plan", r.ok && !r.passes, true);
}
// A badly shaped answer is retried and can recover
{
  const ai = fakeAI([{ days: [] }, goodPlan()]);
  const r = await generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai.askAI });
  eq("shape: recovered", r.ok && r.passes, true);
  eq("shape: attempts", r.attempts, 2);
  eq("shape: retry prompt explains", ai.prompts[1].includes("exactly 5 days"), true);
}
// Never gets the shape right -> clear error
{
  const ai = fakeAI([{ days: [] }]);
  const r = await generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai.askAI });
  eq("badshape: not ok", r.ok, false);
  eq("badshape: error text", r.error.includes("not in the right shape"), true);
  eq("badshape: attempts", r.attempts, 3);
}
// Unknown ingredient and repeats are sent back too
{
  const ai = fakeAI([messyPlan(), goodPlan()]);
  const r = await generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai.askAI });
  eq("messy: recovered", r.passes, true);
  eq("messy: prompt mentions unknown id", ai.prompts[1].includes('unknown ingredient "wagyu-beef"'), true);
  eq("messy: prompt mentions the repeat", ai.prompts[1].includes('"Chicken rice bowl" is used 3 times'), true);
}
// With several bad attempts, the one with the fewest problems wins (messy has 3 problems, salmon has 1)
{
  const ai = fakeAI([messyPlan(), salmonPlan(), messyPlan()]);
  const r = await generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai.askAI });
  eq("best-of: calls", ai.prompts.length, 3);
  eq("best-of: returns the 1-problem plan", r.check.problems.length, 1);
}
// The AI call itself fails -> clear error, no retry loop
{
  const ai = fakeAI([new Error("429 quota exceeded")]);
  const r = await generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai.askAI });
  eq("fail: not ok", r.ok, false);
  eq("fail: message", r.error.includes("429 quota exceeded"), true);
  eq("fail: one call only", ai.prompts.length, 1);
}
// A retry call fails after we already have a plan -> keep the plan and say why
{
  const ai = fakeAI([salmonPlan(), new Error("network down")]);
  const r = await generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai.askAI });
  eq("retryfail: ok with earlier plan", r.ok, true);
  eq("retryfail: has over-budget", r.check.problems[0].type, "over-budget");
  eq("retryfail: error kept", r.retryError.includes("network down"), true);
}
// Bad arguments
eq("no askAI", (await generatePlan({ targets: TARGET, budget: 65 })).ok, false);
eq("bad budget", (await generatePlan({ targets: TARGET, budget: -1, goal: "maintain", askAI: async () => goodPlan() })).ok, false);
eq("bad targets", (await generatePlan({ targets: {}, budget: 65, goal: "maintain", askAI: async () => goodPlan() })).ok, false);

// ---- The prompt: targets, budget, every ingredient, and the rules ----
{
  const p = buildPrompt({ targets: TARGET, budget: 65 });
  eq("prompt has kcal target", p.includes("1767 kcal"), true);
  eq("prompt has protein target", p.includes("67 g protein"), true);
  eq("prompt has budget", p.includes("$65"), true);
  for (const i of ingredients) eq(`prompt lists ${i.id}`, p.includes(`"${i.id}"`), true);
  eq("prompt: dry weight", p.includes("DRY weight"), true);
  eq("prompt: twice a week", p.includes("more than twice"), true);
  eq("prompt: batches", p.includes("cooked in batches"), true);
  eq("prompt: only these ids", p.includes("ONLY the ingredient ids"), true);
  eq("prompt: no numbers from AI", p.includes("Do NOT give calories, macros or prices"), true);
}

// ---- The schema lets the AI return only names, ids and grams ----
{
  const keys = new Set();
  const walk = (o) => { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { keys.add(k); walk(v); } };
  walk(planSchema);
  for (const banned of ["kcal", "calories", "protein", "carbs", "fat", "price", "cost"]) eq(`schema has no ${banned}`, keys.has(banned), false);
  for (const wanted of ["days", "day", "lunch", "dinner", "name", "items", "ingredientId", "grams"]) eq(`schema has ${wanted}`, keys.has(wanted), true);
}

// ---- Goal-dependent calories (checked by hand in test-plan.js: goodPlan days are 1691 to 1775 kcal, $49.84) ----
// Only the instructions added by the retry (not the echoed previous plan, whose ingredient ids can contain words like "flower").
const retrySection = (prompt) => prompt.slice(prompt.indexOf("had problems"), prompt.indexOf("Previous plan:"));
{
  // Target 1300: every day of goodPlan is about 35% over (+30% to +37%).
  const gain = fakeAI([goodPlan()]);
  const rg = await generatePlan({ targets: { ...TARGET, kcal: 1300 }, budget: 65, goal: "gain", askAI: gain.askAI });
  eq("gain 35% over: passes first time", rg.passes, true);
  eq("gain 35% over: 1 call", gain.prompts.length, 1);

  const maint = fakeAI([goodPlan()]);
  const rm = await generatePlan({ targets: { ...TARGET, kcal: 1300 }, budget: 65, goal: "maintain", askAI: maint.askAI });
  eq("maintain 35% over: fails", rm.passes, false);
  eq("maintain 35% over: 3 calls", maint.prompts.length, 3);
  eq("maintain 35% over: day problems", rm.check.problems.filter((p) => p.type === "day-calories").length, 5);
  eq("maintain 35% over: retry prompt says above target", maint.prompts[1].includes("above the 1300 kcal target"), true);
}
{
  // Target 1900, gain: Thu is 11% under. The retry must ask for MORE calories, never fewer.
  const ai = fakeAI([goodPlan()]);
  await generatePlan({ targets: { ...TARGET, kcal: 1900 }, budget: 65, goal: "gain", askAI: ai.askAI });
  const retry = retrySection(ai.prompts[1]);
  eq("gain under: asks to add calories", retry.includes("Add calories on the days that are too low"), true);
  eq("gain under: names the minimum (90% of 1900 = 1710)", retry.includes("at least 1710 kcal"), true);
  for (const banned of ["Cut calories", "smaller amounts", "reduce", "Reduce", "fewer calories", "lower"]) {
    eq(`gain under: retry text does not say "${banned}"`, retry.includes(banned), false);
  }
}
{
  // Over budget on a gain plan: ask for cheaper ingredients but keep calories up (no "smaller amounts").
  const ai = fakeAI([salmonPlan()]);
  await generatePlan({ targets: TARGET, budget: 65, goal: "gain", askAI: ai.askAI });
  const retry = retrySection(ai.prompts[1]);
  eq("gain over budget: cheaper ingredients", retry.includes("Use cheaper ingredients, but keep calories up"), true);
  eq("gain over budget: minimum 1591", retry.includes("at least 1591 kcal"), true);
  eq("gain over budget: no smaller amounts", retry.includes("smaller amounts"), false);
  eq("gain over budget: still says over budget by $27.15", retry.includes("Over budget by $27.15"), true);

  // The same over-budget plan on a maintain plan keeps the old advice.
  const ai2 = fakeAI([salmonPlan()]);
  await generatePlan({ targets: TARGET, budget: 65, goal: "maintain", askAI: ai2.askAI });
  eq("maintain over budget: smaller amounts allowed", retrySection(ai2.prompts[1]).includes("cheaper ingredients or smaller amounts"), true);
}
{
  // Target 1100, gain: days are +54% to +61%, beyond the 50% sanity limit, so the retry may ask to cut (down to 1650 at most).
  const ai = fakeAI([goodPlan()]);
  await generatePlan({ targets: { ...TARGET, kcal: 1100 }, budget: 65, goal: "gain", askAI: ai.askAI });
  const retry = retrySection(ai.prompts[1]);
  eq("gain over limit: asks to cut only over the limit", retry.includes("Cut calories only on the days over the 1650 kcal limit"), true);
  eq("gain over limit: keeps the floor (990)", retry.includes("at or above 990 kcal"), true);
  eq("gain over limit: does not ask to add", retry.includes("Add calories"), false);
}
{
  // First prompt wording depends on the goal
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
eq("generatePlan needs a valid goal", (await generatePlan({ targets: TARGET, budget: 65, goal: "bulk", askAI: async () => goodPlan() })).ok, false);
eq("generatePlan needs a goal", (await generatePlan({ targets: TARGET, budget: 65, askAI: async () => goodPlan() })).ok, false);

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
  const ai = fakeAI([goodPlan()]);
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
  eq("handler success -> 200", res.code, 200);
  eq("handler targets lunch+dinner kcal", res.body.targets.lunchDinner.kcal, 1767);
  eq("handler attempts", res.body.attempts, 1);
  eq("handler passes", res.body.passes, true);
  near("handler cost", res.body.check.cost.total, 49.84);
  eq("handler plan has 5 days", res.body.plan.days.length, 5);
  eq("handler prompt used the calculated target", ai.prompts[0].includes("1767 kcal"), true);

  res = mockRes(); await handler({ method: "POST", body: { profile } }, res);
  eq("handler default budget is 65", res.body.check.cost.budget, 65);
  eq("handler gain prompt mentions gaining", ai.prompts[0].includes("GAIN weight"), true);
}
{
  // The profile's goal reaches the checker. Same body (60 kg, 170 cm, 25 y, male, light):
  //   BMR = 600 + 1062.5 - 125 + 5 = 1542.5, maintenance = 1542.5 * 1.375 = 2120.9 kcal
  //   maintain: lunch+dinner = 65% of 2120.9 = 1378.6 -> goodPlan days (1691 to 1775) are +23% to +29%: fails the 10% rule
  //   gain: (2120.9 + 300) * 0.65 = 1573.6 -> 1574 -> goodPlan days are +7.4% to +12.8%: fine for a gain plan
  const body = { weightKg: 60, heightCm: 170, age: 25, sex: "male", activity: "light" };
  const gainRes = mockRes();
  await createHandler(fakeAI([goodPlan()]).askAI)({ method: "POST", body: { profile: { ...body, goal: "gain" }, budget: 65 } }, gainRes);
  eq("handler gain lunch+dinner kcal", gainRes.body.targets.lunchDinner.kcal, 1574);
  eq("handler gain: plan passes", gainRes.body.passes, true);
  eq("handler gain: 1 attempt", gainRes.body.attempts, 1);

  const maintRes = mockRes();
  await createHandler(fakeAI([goodPlan()]).askAI)({ method: "POST", body: { profile: { ...body, goal: "maintain" }, budget: 65 } }, maintRes);
  eq("handler maintain lunch+dinner kcal", maintRes.body.targets.lunchDinner.kcal, 1379);
  eq("handler maintain: same plan fails", maintRes.body.passes, false);
  eq("handler maintain: 3 attempts", maintRes.body.attempts, 3);
}
{
  const handler = createHandler(fakeAI([salmonPlan()]).askAI);
  const res = mockRes(); await handler({ method: "POST", body: { profile, budget: 65 } }, res);
  eq("handler over budget -> still 200", res.code, 200);
  eq("handler over budget attempts", res.body.attempts, 3);
  eq("handler over budget passes false", res.body.passes, false);
  near("handler over budget overBy", res.body.check.cost.overBy, 27.15);
}
{
  const handler = createHandler(fakeAI([new Error("boom")]).askAI);
  const res = mockRes(); await handler({ method: "POST", body: { profile, budget: 65 } }, res);
  eq("handler AI failure -> 502", res.code, 502);
  eq("handler AI failure has a message", typeof res.body.error, "string");
}

console.log(failed ? `${failed} check(s) failed` : "OK: all generate-plan tests passed");
process.exit(failed ? 1 : 0);
