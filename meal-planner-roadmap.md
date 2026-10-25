# Meal Prep Cost and Macro Planner: Build Roadmap

**What it is:** a web app (works on your phone). You enter your body details and goal, it works out your calorie target, and the AI designs two recipes from a fixed ALDI ingredient list: one lunch and one dinner, one serving each. They are cooked once as a batch of 5 and eaten Monday to Friday. Code expands them into 5 days and works out every calorie, macro and dollar.

**Spec:** the PRD (PRD: Meal Prep Cost and Macro Planner). **Stack:** same as the gym app: React + Vite, Vercel serverless functions, Gemini free tier, localStorage.

**Golden rules**
- Code does the maths. The AI only designs two recipes (ingredients + grams).
- Every number must trace back to an ingredient row.
- Commit to GitHub at the end of every stage.

---

## Stage 1: Ingredient data
- [x] Done (nutrition values are estimates, mostly USDA; prices checked 2026-10-25)
**Goal:** `ingredients.js` holds about 14 to 20 ALDI ingredients with pack size, price, pricing mode and nutrition per 100g.
**Done when:** every nutrition value is checked against a pack label or database, and prices have a "checked on" date.

## Stage 2: Calorie and macro target (code only)
- [x] Done (`targets.js`, tested by `test-targets.js`)
**Goal:** a function takes weight, height, age, sex, activity and goal, and returns daily calories and macros. Lunch and dinner get 65%.
**Done when:** a test script checks 3 people by hand, with caps on deficit and surplus.

## Stage 3: Plan calculator and checker (code only)
- [x] Done (`plan.js`, tested by `test-plan.js`)
**Goal:** given two recipes (lunch and dinner, each ingredient + grams for one serving), code expands them into 5 identical days (Mon to Fri) and returns per-serving and per-day macros, an estimated cost per serving, weekly cost (5 servings of each, whole packs rounded up), a shopping list, and flags for unknown ingredients, bad grams, a day off the calorie target (depends on the goal) and over budget. There is no repeat rule: repeating is the point.
**Done when:** a test script matches a hand calculation within 5%.

## Stage 4: AI picks the meals
- [x] Code done and tested with a fake AI (`generatePlan.js`, `gemini.js`, `api/plan.js`). Still to do: run `node try-plan.js` once with a real key.
**Goal:** `api/plan.js` sends the targets, budget and ingredient list to Gemini, gets two recipes back as structured JSON (`{ lunch, dinner }`), runs the Stage 3 checks, and retries with cheaper ingredients up to 2 times. It returns the two recipes, the 5 days, the check result and the shopping list.
**Done when:** a generated plan passes the checks, or comes back with an "over budget by $X" note.

## Stage 5: The app
- [x] 5a done: the app works (`web/`), plain styling in `web/src/theme.css`. Still to do: 5b visual design, and a real end-to-end run with `vercel dev` and a Gemini key.
**Goal:** profile form, targets, a "Your week" view (the two recipes once, with grams for one serving and for the whole batch), shopping list, saved plan in localStorage.
**Done when:** you can go from the form to a saved plan on your phone in under 2 minutes.

## Stage 6: Deploy
- [ ] Not started
**Goal:** a live link that works on your phone, with the API key on Vercel.

## Stage 7: Pitch to Warren
- [ ] Not started
**Goal:** a short pitch as if Warren is the customer: the problem in his words, the UVP, proof, and what you'd build next (swap a single meal).
