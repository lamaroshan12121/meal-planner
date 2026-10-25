// Recipes used by test-generate-plan.js and the web app's sample plans. Bulk cooking: ONE lunch and ONE dinner (one serving each),
// cooked as 5 servings and eaten Mon to Fri. Hand calculations are in test-plan.js. At the 1,767 kcal target and a $65 budget:
//   goodRecipes:   day = 901 + 874.4 = 1775.4 kcal (+0.5%), weekly cost $38.98, no problems
//   salmonRecipes: day = 885 + 891 = 1776 kcal, weekly cost $84.38, so $19.38 over $65 (one problem: over-budget)
//   messyRecipes:  unknown ingredient + a day of 921 kcal (-47.9%), weekly cost $12.93 (two problems)
export const TARGET = { kcal: 1767, protein: 67, carbs: 265, fat: 49 };

const meal = (name, ...items) => ({ name, items: items.map(([ingredientId, grams]) => ({ ingredientId, grams })) });

export const goodRecipes = () => ({
  lunch: meal("Chicken rice bowl", ["chicken-breast", 250], ["rice", 140], ["frozen-mixed-veg", 150]),
  dinner: meal("Beef pasta", ["beef-mince", 150], ["pasta", 140], ["diced-tomatoes", 200]),
});

export const salmonRecipes = () => ({
  lunch: meal("Salmon and rice", ["salmon", 250], ["rice", 100]),
  dinner: meal("Salmon and pasta", ["salmon", 250], ["pasta", 100]),
});

export const messyRecipes = () => ({
  lunch: meal("Tuna pasta", ["tuna", 185], ["pasta", 100]),
  dinner: meal("Wagyu stew", ["wagyu-beef", 200], ["rice", 100]),
});
