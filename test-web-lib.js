// Run: node test-web-lib.js
// Tests the browser-side logic in web/src/lib (form validation, saving, sample plans, the API call) without a browser.
import { validateForm, ACTIVITY_OPTIONS, GOAL_OPTIONS, EMPTY_FORM, DEFAULT_BUDGET } from "./web/src/lib/profile.js";
import { loadForm, saveForm, loadPlanRecord, savePlanRecord } from "./web/src/lib/storage.js";
import { buildResult } from "./web/src/lib/results.js";
import { buildSample, SAMPLE_VARIANTS } from "./web/src/lib/sample.js";
import { requestPlan } from "./web/src/lib/api.js";
import { formatPriceDate, formatSavedAt, itemLabel, money, signedPercent } from "./web/src/lib/format.js";
import { ACTIVITY_MULTIPLIERS } from "./targets.js";
import { PRICES_CHECKED } from "./ingredients.js";

let failed = 0;
const eq = (label, got, want) => { if (got !== want) { failed++; console.log(`FAIL ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); } };
const near = (label, got, want, tol = 0.001) => { if (Math.abs(got - want) > tol) { failed++; console.log(`FAIL ${label}: got ${got}, want ${want}`); } };

// ---------- Form options match targets.js ----------
eq("activity options match targets.js", ACTIVITY_OPTIONS.map((o) => o.value).join(), Object.keys(ACTIVITY_MULTIPLIERS).join());
eq("goal options", GOAL_OPTIONS.map((o) => o.value).join(), "lose,maintain,gain");
eq("default budget is 65", DEFAULT_BUDGET, 65);
eq("empty form has budget 65", EMPTY_FORM.budget, "65");

// ---------- Validation (same rules as calculateTargets) ----------
const good = { weightKg: "57", heightCm: "175.3", age: "22", sex: "male", activity: "moderate", goal: "gain", budget: "65" };
let v = validateForm(good);
eq("good form ok", v.ok, true);
eq("strings become numbers", v.profile.weightKg === 57 && v.profile.heightCm === 175.3 && v.profile.age === 22, true);
eq("budget becomes a number", v.budget, 65);

v = validateForm(EMPTY_FORM);
eq("empty form not ok", v.ok, false);
eq("blank weight message", v.errors.weightKg, "Enter your weight in kg.");
eq("blank height message", v.errors.heightCm, "Enter your height in cm.");
eq("blank age message", v.errors.age, "Enter your age in years.");
eq("blank sex message", v.errors.sex, "Choose male or female.");
eq("blank activity message", v.errors.activity, "Choose how active you are.");
eq("blank goal message", v.errors.goal, "Choose a goal.");
eq("default budget alone is fine", "budget" in v.errors, false);

v = validateForm({ ...good, weightKg: "10", heightCm: "500", age: "12" });
eq("weight range message", v.errors.weightKg, "Weight must be between 30 and 300 kg.");
eq("height range message", v.errors.heightCm, "Height must be between 120 and 230 cm.");
eq("age range message", v.errors.age, "Age must be between 18 and 90 years.");
eq("only the bad fields have errors", Object.keys(v.errors).sort().join(), "age,heightCm,weightKg");

eq("text in weight", validateForm({ ...good, weightKg: "abc" }).errors.weightKg, "Weight must be a number.");
eq("spaces only counts as blank", validateForm({ ...good, weightKg: "   " }).errors.weightKg, "Enter your weight in kg.");
eq("budget too low", validateForm({ ...good, budget: "5" }).errors.budget, "Budget must be between $10 and $500.");
eq("budget too high", validateForm({ ...good, budget: "9999" }).errors.budget, "Budget must be between $10 and $500.");
eq("budget text", validateForm({ ...good, budget: "lots" }).errors.budget, "Budget must be between $10 and $500.");
eq("budget blank", validateForm({ ...good, budget: "" }).errors.budget, "Enter your weekly budget in dollars.");
eq("budget decimal ok", validateForm({ ...good, budget: "62.50" }).budget, 62.5);

// ---------- Saving to localStorage ----------
const fakeStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), raw: m }; };
const brokenStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); } };

let s = fakeStorage();
eq("no saved form at first", loadForm(s), null);
eq("save form returns true", saveForm(good, s), true);
eq("form round-trips", JSON.stringify(loadForm(s)), JSON.stringify(good));
eq("no saved plan at first", loadPlanRecord(s), null);

const sample = buildSample("good");
const record = { savedAt: "2026-10-25T05:42:00.000Z", source: "ai", form: good, profile: sample.profile, budget: 65, recipes: sample.recipes, attempts: 1 };
eq("save plan returns true", savePlanRecord(record, s), true);
const back = loadPlanRecord(s);
eq("plan round-trips", JSON.stringify(back), JSON.stringify(record));
// Only the AI's recipe choices are stored (names, ids, grams): no calories, macros or prices
const raw = [...s.raw.values()].join("");
eq("stored plan has no kcal", raw.includes("kcal"), false);
eq("stored plan has no cost", raw.includes("cost") || raw.includes("price"), false);

s.setItem("mealPlanner.plan", "{not json");
eq("corrupt plan JSON -> null", loadPlanRecord(s), null);
s.setItem("mealPlanner.plan", JSON.stringify({ profile: {}, budget: 65, recipes: { lunch: {} } }));
eq("malformed plan record -> null", loadPlanRecord(s), null);
eq("blocked storage: load form -> null", loadForm(brokenStorage), null);
eq("blocked storage: load plan -> null", loadPlanRecord(brokenStorage), null);
eq("blocked storage: save form -> false (no throw)", saveForm(good, brokenStorage), false);
eq("blocked storage: save plan -> false (no throw)", savePlanRecord(record, brokenStorage), false);
eq("no localStorage at all (Node): load -> null", loadPlanRecord(), null);
eq("no localStorage at all (Node): save -> false", saveForm(good), false);

// ---------- Rebuilding what the screen shows from a record ----------
// Numbers match the hand calculations in test-plan.js and test-targets.js. Bulk cooking: 2 recipes, 5 servings each.
const good1 = buildResult(buildSample("good"));
eq("sample targets: lunch+dinner kcal", good1.targets.lunchDinner.kcal, 1767);
near("good sample cost", good1.check.cost.total, 38.98);
eq("good sample servings", good1.check.servings, 5);
eq("good sample recipe names", `${good1.check.recipes.lunch.name} / ${good1.check.recipes.dinner.name}`, "Chicken rice bowl / Beef pasta");
eq("good sample batch grams (chicken 250 g x 5)", good1.check.recipes.lunch.items[0].batchGrams, 1250);
eq("good sample 5 identical days", new Set(good1.check.days.map((d) => d.totals.kcal)).size, 1);
eq("good sample passes", good1.check.passes, true);
eq("good sample has 10 meals (5 days x 2)", good1.check.meals.length, 10);
const over = buildResult(buildSample("over"));
near("over-budget sample cost", over.check.cost.total, 84.38);
near("over-budget sample overBy", over.check.cost.overBy, 19.38);
eq("over-budget sample problems", over.check.problems.map((p) => p.type).join(), "over-budget");
const messy = buildResult(buildSample("problems"));
eq("problem sample types", messy.check.problems.map((p) => p.type).sort().join(), "day-calories,unknown-ingredient");
eq("every sample variant builds", SAMPLE_VARIANTS.every((x) => buildResult(buildSample(x.key)) !== null), true);
eq("unknown variant falls back to good", buildSample("nope").recipes.lunch.name, "Chicken rice bowl");
eq("sample is not saved (source)", buildSample("good").source, "sample");
eq("a saved record rebuilds the same result", buildResult(back).check.cost.total, good1.check.cost.total);
eq("null record -> null", buildResult(null), null);
eq("bad profile -> null", buildResult({ profile: { weightKg: 1 }, budget: 65, recipes: sample.recipes }), null);
eq("bad recipes -> null", buildResult({ profile: sample.profile, budget: 65, recipes: { lunch: sample.recipes.lunch } }), null);
eq("old saved 5-day plan -> null", buildResult({ profile: sample.profile, budget: 65, plan: { days: [] } }), null);

// ---------- Display helpers ----------
eq("price date", formatPriceDate(PRICES_CHECKED), "25 Oct 2026");
eq("money", money(49.8), "$49.80");
eq("signed percent +", signedPercent(0.5), "+0.5%");
eq("signed percent -", signedPercent(-4.3), "-4.3%");
eq("bad saved date -> empty", formatSavedAt("nonsense"), "");
eq("saved date has the year", formatSavedAt("2026-10-25T05:42:00.000Z").includes("2026"), true);
eq("rice label says dry weight", itemLabel({ ingredientId: "rice", name: "Long grain rice (dry weight)" }).includes("dry weight"), true);
eq("dry weight not doubled", (itemLabel({ ingredientId: "rice", name: "Long grain rice (dry weight)" }).match(/dry weight/g) || []).length, 1);
eq("dry weight added if a name lacks it", itemLabel({ ingredientId: "pasta", name: "Pasta" }), "Pasta (dry weight)");
eq("non-dry item unchanged", itemLabel({ ingredientId: "eggs", name: "Barn laid eggs" }), "Barn laid eggs");

// ---------- The API call (fake fetch, nothing leaves this machine) ----------
const realFetch = globalThis.fetch;
const reply = (status, body, isJson = true) => async () => ({ ok: status < 400, status, json: async () => { if (!isJson) throw new Error("not json"); return body; } });
const req = { profile: sample.profile, budget: 65 };
const failsWith = async (label, fetchImpl, wantText) => {
  globalThis.fetch = fetchImpl;
  try { await requestPlan(req); failed++; console.log(`FAIL ${label}: should have thrown`); }
  catch (e) { if (!e.message.includes(wantText)) { failed++; console.log(`FAIL ${label}: got "${e.message}"`); } }
};
let sent;
globalThis.fetch = async (url, opts) => { sent = { url, opts }; return reply(200, { recipes: sample.recipes, attempts: 2, passes: true })(); };
const data = await requestPlan(req);
eq("api: posts to /api/plan", sent.url, "/api/plan");
eq("api: method POST", sent.opts.method, "POST");
eq("api: body is profile + budget only", Object.keys(JSON.parse(sent.opts.body)).sort().join(), "budget,profile");
eq("api: returns the recipes", `${data.recipes.lunch.name} / ${data.recipes.dinner.name}`, "Chicken rice bowl / Beef pasta");
eq("api: returns attempts", data.attempts, 2);
await failsWith("api 400 with details", reply(400, { error: "Invalid profile", details: ["Weight must be between 30 and 300 kg."] }), "Weight must be between 30 and 300 kg.");
await failsWith("api 502 message", reply(502, { error: "Could not generate a plan. Try again in a minute." }), "Could not generate a plan");
await failsWith("api non-JSON error", reply(500, null, false), "returned an error (500)");
await failsWith("api network down", async () => { throw new TypeError("fetch failed"); }, "Couldn't reach the planner");
await failsWith("api 200 without plan", reply(200, {}), "did not return a plan");
globalThis.fetch = async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; };
try { await requestPlan(req); failed++; console.log("FAIL abort should throw"); } catch (e) { eq("api: abort keeps its name", e.name, "AbortError"); }
globalThis.fetch = realFetch;

console.log(failed ? `${failed} check(s) failed` : "OK: all web lib tests passed");
process.exit(failed ? 1 : 0);
