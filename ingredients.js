// Ingredient data for the meal planner.
// NOTE: all nutrition values are ESTIMATES (generic values per 100g, mostly USDA FoodData Central), not exact pack labels.
// The plan targets are good to about 5%, and the app labels its numbers as estimates.
// Prices: ALDI Australia website (aldi.com.au), checked 2026-10-25. They change, so keep the date.

export const PRICES_CHECKED = "2026-10-25";

// pricing: "pack"   = you must buy whole packs of packGrams for the price
//          "weight" = sold per kg, so you pay for the grams you need (price is per 1000 g)
// state:   "dry" = nutrition is for the dry/uncooked product, so grams are dry weight (cooked weighs 2 to 3 times more).
//          Other items are raw / as-bought.
export const ingredients = [
  { id: "chicken-breast", name: "Chicken breast fillets", packGrams: 1000, price: 11.99, pricing: "weight", per100g: { kcal: 120, protein: 22.5, carbs: 0, fat: 2.6 } },
  { id: "beef-mince", name: "Beef mince (2 star)", packGrams: 500, price: 6.49, pricing: "pack", per100g: { kcal: 210, protein: 19, carbs: 0, fat: 14 } },
  // packGrams is edible egg (about 700 g in shell minus shell), because the nutrition values are for the edible part.
  { id: "eggs", name: "Barn laid eggs", packGrams: 620, price: 5.29, pricing: "pack", per100g: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5 } },
  { id: "tuna", name: "Tuna chunks in springwater 185g", packGrams: 185, price: 1.69, pricing: "pack", per100g: { kcal: 100, protein: 23, carbs: 0, fat: 1 } },
  { id: "salmon", name: "Atlantic salmon fillets 250g", packGrams: 250, price: 7.99, pricing: "pack", per100g: { kcal: 208, protein: 20.4, carbs: 0, fat: 13.4 } },
  { id: "red-lentils", name: "Red split lentils (dry weight)", state: "dry", packGrams: 500, price: 1.69, pricing: "pack", per100g: { kcal: 358, protein: 23.9, carbs: 63.1, fat: 2.2 } },
  { id: "rice", name: "Long grain rice (dry weight)", state: "dry", packGrams: 2000, price: 3.59, pricing: "pack", per100g: { kcal: 365, protein: 7.1, carbs: 80, fat: 0.7 } },
  { id: "pasta", name: "Pasta (dry weight)", state: "dry", packGrams: 500, price: 0.89, pricing: "pack", per100g: { kcal: 371, protein: 13, carbs: 74.7, fat: 1.5 } },
  { id: "potatoes", name: "Washed red potatoes", packGrams: 1000, price: 3.99, pricing: "weight", per100g: { kcal: 77, protein: 2, carbs: 17, fat: 0.1 } },
  { id: "frozen-mixed-veg", name: "Frozen mixed vegetables 1kg", packGrams: 1000, price: 2.79, pricing: "pack", per100g: { kcal: 60, protein: 3, carbs: 10, fat: 0.5 } },
  { id: "frozen-green-beans", name: "Frozen green beans 1kg", packGrams: 1000, price: 2.79, pricing: "pack", per100g: { kcal: 31, protein: 1.8, carbs: 7, fat: 0.2 } },
  { id: "frozen-peas", name: "Frozen garden peas 1kg", packGrams: 1000, price: 2.49, pricing: "pack", per100g: { kcal: 70, protein: 5, carbs: 12, fat: 0.4 } },
  { id: "diced-tomatoes", name: "Diced tomatoes 400g", packGrams: 400, price: 0.95, pricing: "pack", per100g: { kcal: 20, protein: 1, carbs: 4, fat: 0.1 } },
  // 1L bottle is about 920 g (oil is lighter than water).
  { id: "sunflower-oil", name: "Sunflower oil 1L", packGrams: 920, price: 4.99, pricing: "pack", per100g: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },
];
