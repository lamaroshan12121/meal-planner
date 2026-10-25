// Run: node try-plan.js            -> ONE real Gemini call (uses a little of your free quota)
//      node try-plan.js --retries  -> the full loop: up to 3 calls (1 + 2 retries)
// Uses the lunch-and-dinner target 1,767 kcal / 67 g protein, goal "gain" and a $65 budget. Needs GEMINI_API_KEY in .env.
// BULK COOKING: the AI designs one lunch and one dinner (one serving each). They are cooked as 5 servings and eaten Mon to Fri.
import { generatePlan } from "./generatePlan.js";
import { geminiAskAI } from "./gemini.js";

const targets = { kcal: 1767, protein: 67, carbs: 265, fat: 49 };
const budget = 65;
const goal = "gain"; // the example person is gaining; a gain plan may go over the calorie target (see plan.js)
const maxRetries = process.argv.includes("--retries") ? 2 : 0;

let calls = 0;
const askAI = async (prompt) => { calls++; return geminiAskAI(prompt); };

console.log(`Asking Gemini (${process.env.GEMINI_MODEL || "gemini-3.8-flash"}), max ${maxRetries + 1} call(s)...`);
const r = await generatePlan({ targets, budget, goal, askAI, maxRetries });
console.log(`AI calls made: ${calls}\n`);

if (!r.ok) {
  console.log("ERROR:", r.error);
  process.exit(1);
}

const money = (n) => `$${n.toFixed(2)}`;
const { check } = r;

for (const slot of ["lunch", "dinner"]) {
  const m = check.recipes[slot];
  console.log(`${slot.toUpperCase()}: ${m.name}   (${m.totals.kcal} kcal, ${m.totals.protein} g protein, est ${money(m.estCost)} per serving)`);
  for (const i of m.items) console.log(`    ${i.name}: ${i.grams} g per serving, ${i.batchGrams} g for the batch (x${check.servings})`);
}

const d = check.days[0];
console.log(`\nMon to Fri: this lunch and this dinner every day.`);
console.log(`Each day: ${d.totals.kcal} kcal (${d.diffPct > 0 ? "+" : ""}${d.diffPct}% vs ${targets.kcal} target), protein ${d.totals.protein} g, carbs ${d.totals.carbs} g, fat ${d.totals.fat} g`);

console.log(`\nShopping list (for ${check.servings} servings of each):`);
for (const l of check.shoppingList) {
  const buy = l.packs === null ? `${l.grams} g by weight` : `${l.packs} x ${l.packGrams} g pack`;
  console.log(`  ${l.name}: need ${l.grams} g, buy ${buy} = ${money(l.cost)}`);
}
console.log(`\nWeekly cost (whole packs): ${money(check.cost.total)} against ${money(budget)}`);
console.log(check.problems.length ? "\nProblems:\n" + check.problems.map((p) => "  - " + p.message).join("\n") : "\nNo problems: the plan passes all checks.");
