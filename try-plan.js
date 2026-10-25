// Run: node try-plan.js            -> ONE real Gemini call (uses a little of your free quota)
//      node try-plan.js --retries  -> the full loop: up to 3 calls (1 + 2 retries)
// Uses the lunch-and-dinner target 1,767 kcal / 67 g protein and a $65 budget. Needs GEMINI_API_KEY in .env.
import { generatePlan } from "./generatePlan.js";
import { geminiAskAI } from "./gemini.js";

const targets = { kcal: 1767, protein: 67, carbs: 265, fat: 49 };
const budget = 65;
const maxRetries = process.argv.includes("--retries") ? 2 : 0;

let calls = 0;
const askAI = async (prompt) => { calls++; return geminiAskAI(prompt); };

console.log(`Asking Gemini (${process.env.GEMINI_MODEL || "gemini-3.8-flash"}), max ${maxRetries + 1} call(s)...`);
const r = await generatePlan({ targets, budget, askAI, maxRetries });
console.log(`AI calls made: ${calls}\n`);

if (!r.ok) {
  console.log("ERROR:", r.error);
  process.exit(1);
}

const money = (n) => `$${n.toFixed(2)}`;
for (const m of r.check.meals) {
  console.log(`${m.day} ${m.slot.padEnd(6)} ${m.name}  (${m.totals.kcal} kcal, P ${m.totals.protein} g, est ${money(m.estCost)})`);
  console.log(`    ${m.items.map((i) => `${i.ingredientId} ${i.grams}g`).join(", ")}`);
}
console.log("\nDays (target " + targets.kcal + " kcal):");
for (const d of r.check.days) console.log(`  ${d.day}: ${d.totals.kcal} kcal (${d.diffPct > 0 ? "+" : ""}${d.diffPct}%), protein ${d.totals.protein} g`);

console.log("\nShopping list:");
for (const l of r.check.shoppingList) {
  const buy = l.packs === null ? `${l.grams} g by weight` : `${l.packs} x ${l.packGrams} g pack`;
  console.log(`  ${l.name}: ${buy} = ${money(l.cost)}`);
}
console.log(`\nWeekly cost (whole packs): ${money(r.check.cost.total)} against ${money(budget)}`);
console.log(r.check.problems.length ? "\nProblems:\n" + r.check.problems.map((p) => "  - " + p.message).join("\n") : "\nNo problems: the plan passes all checks.");
