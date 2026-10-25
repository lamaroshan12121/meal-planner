// Sanity check for ingredients.js. Run: node test-ingredients.js
import { ingredients } from "./ingredients.js";

let failed = 0;
const fail = (msg) => { failed++; console.log("FAIL:", msg); };

const ids = new Set();
for (const i of ingredients) {
  if (ids.has(i.id)) fail(`duplicate id ${i.id}`);
  ids.add(i.id);
  if (!["pack", "weight"].includes(i.pricing)) fail(`${i.id}: bad pricing "${i.pricing}"`);
  if (!(i.packGrams > 0) || !(i.price > 0)) fail(`${i.id}: packGrams and price must be positive`);
  const n = i.per100g;
  // Atwater check: kcal should be close to 4*protein + 4*carbs + 9*fat. Allow 20% (fibre in veg such as green beans, rounding).
  const calc = 4 * n.protein + 4 * n.carbs + 9 * n.fat;
  const diff = Math.abs(calc - n.kcal) / n.kcal;
  if (diff > 0.2) fail(`${i.id}: kcal ${n.kcal} vs macros-implied ${calc.toFixed(0)} (${(diff * 100).toFixed(0)}% off)`);
  if (["rice", "pasta", "red-lentils"].includes(i.id) && i.state !== "dry") fail(`${i.id}: should have state "dry"`);
}
if (ingredients.length < 14 || ingredients.length > 20) fail(`expected 14 to 20 ingredients, got ${ingredients.length}`);

console.log(failed ? `${failed} check(s) failed` : `OK: ${ingredients.length} ingredients passed`);
process.exit(failed ? 1 : 0);
