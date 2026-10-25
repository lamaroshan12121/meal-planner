// Plans used by test-generate-plan.js. Same plans (and hand calculations) as test-plan.js:
//   goodPlan:  $49.84, no problems at a 1,767 kcal target and $65 budget
//   salmonPlan: $92.15, so $27.15 over a $65 budget (one problem: over-budget)
//   messyPlan: unknown ingredient + Monday far off target + a meal used 3 times (three problems), $41.35
export const TARGET = { kcal: 1767, protein: 67, carbs: 265, fat: 49 };

const meal = (name, ...items) => ({ name, items: items.map(([ingredientId, grams]) => ({ ingredientId, grams })) });
const week = (pairs) => ({ days: pairs.map(([lunch, dinner], i) => ({ day: ["Mon", "Tue", "Wed", "Thu", "Fri"][i], lunch, dinner })) });

const M1 = () => meal("Chicken rice bowl", ["chicken-breast", 250], ["rice", 140], ["frozen-mixed-veg", 150]);
const M2 = () => meal("Beef pasta", ["beef-mince", 150], ["pasta", 140], ["diced-tomatoes", 200]);
const M3 = () => meal("Egg potato hash", ["eggs", 240], ["potatoes", 500], ["sunflower-oil", 10]);
const M4 = () => meal("Lentil rice", ["red-lentils", 100], ["rice", 100], ["frozen-mixed-veg", 200], ["sunflower-oil", 10]);
const M5 = () => meal("Chicken potato", ["chicken-breast", 300], ["potatoes", 400], ["frozen-green-beans", 200], ["sunflower-oil", 10]);

export const goodPlan = () => week([[M1(), M2()], [M3(), M4()], [M5(), M1()], [M2(), M3()], [M4(), M5()]]);

const P1 = () => meal("Salmon and rice", ["salmon", 250], ["rice", 100]);
const P2 = () => meal("Salmon and pasta", ["salmon", 250], ["pasta", 100]);
const P3 = () => meal("Salmon and potato", ["salmon", 250], ["potatoes", 450]);
const P4 = () => meal("Salmon and lentils", ["salmon", 250], ["red-lentils", 100]);
const P5 = () => meal("Salmon, peas and rice", ["salmon", 250], ["frozen-peas", 300], ["rice", 50]);
export const salmonPlan = () => week([[P1(), P2()], [P3(), P4()], [P5(), P1()], [P2(), P3()], [P4(), P5()]]);

export const messyPlan = () => week([
  [meal("Tuna pasta", ["tuna", 185], ["pasta", 100]), meal("Wagyu stew", ["wagyu-beef", 200], ["rice", 100])],
  [M1(), M1()],
  [M1(), M2()],
  [M2(), M3()],
  [M4(), M3()],
]);
