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
  const r = await generatePlan({ targets: TARGET, budget: 65, askAI: ai.askAI });
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
  const r = await generatePlan({ targets: TARGET, budget: 65, askAI: ai.askAI });
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
  const r = await generatePlan({ targets: TARGET, budget: 65, askAI: ai.askAI });
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
  const r = await generatePlan({ targets: TARGET, budget: 65, askAI: ai.askAI, maxRetries: 0 });
  eq("maxRetries 0 -> 1 call", ai.prompts.length, 1);
  eq("maxRetries 0 still returns plan", r.ok && !r.passes, true);
}
// A badly shaped answer is retried and can recover
{
  const ai = fakeAI([{ days: [] }, goodPlan()]);
  const r = await generatePlan({ targets: TARGET, budget: 65, askAI: ai.askAI });
  eq("shape: recovered", r.ok && r.passes, true);
  eq("shape: attempts", r.attempts, 2);
  eq("shape: retry prompt explains", ai.prompts[1].includes("exactly 5 days"), true);
}
// Never gets the shape right -> clear error
{
  const ai = fakeAI([{ days: [] }]);
  const r = await generatePlan({ targets: TARGET, budget: 65, askAI: ai.askAI });
  eq("badshape: not ok", r.ok, false);
  eq("badshape: error text", r.error.includes("not in the right shape"), true);
  eq("badshape: attempts", r.attempts, 3);
}
// Unknown ingredient and repeats are sent back too
{
  const ai = fakeAI([messyPlan(), goodPlan()]);
  const r = await generatePlan({ targets: TARGET, budget: 65, askAI: ai.askAI });
  eq("messy: recovered", r.passes, true);
  eq("messy: prompt mentions unknown id", ai.prompts[1].includes('unknown ingredient "wagyu-beef"'), true);
  eq("messy: prompt mentions the repeat", ai.prompts[1].includes('"Chicken rice bowl" is used 3 times'), true);
}
// With several bad attempts, the one with the fewest problems wins (messy has 3 problems, salmon has 1)
{
  const ai = fakeAI([messyPlan(), salmonPlan(), messyPlan()]);
  const r = await generatePlan({ targets: TARGET, budget: 65, askAI: ai.askAI });
  eq("best-of: calls", ai.prompts.length, 3);
  eq("best-of: returns the 1-problem plan", r.check.problems.length, 1);
}
// The AI call itself fails -> clear error, no retry loop
{
  const ai = fakeAI([new Error("429 quota exceeded")]);
  const r = await generatePlan({ targets: TARGET, budget: 65, askAI: ai.askAI });
  eq("fail: not ok", r.ok, false);
  eq("fail: message", r.error.includes("429 quota exceeded"), true);
  eq("fail: one call only", ai.prompts.length, 1);
}
// A retry call fails after we already have a plan -> keep the plan and say why
{
  const ai = fakeAI([salmonPlan(), new Error("network down")]);
  const r = await generatePlan({ targets: TARGET, budget: 65, askAI: ai.askAI });
  eq("retryfail: ok with earlier plan", r.ok, true);
  eq("retryfail: has over-budget", r.check.problems[0].type, "over-budget");
  eq("retryfail: error kept", r.retryError.includes("network down"), true);
}
// Bad arguments
eq("no askAI", (await generatePlan({ targets: TARGET, budget: 65 })).ok, false);
eq("bad budget", (await generatePlan({ targets: TARGET, budget: -1, askAI: async () => goodPlan() })).ok, false);
eq("bad targets", (await generatePlan({ targets: {}, budget: 65, askAI: async () => goodPlan() })).ok, false);

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
