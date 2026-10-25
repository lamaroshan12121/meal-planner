# PRD: Meal Prep Cost and Macro Planner

Oct 25, 2026 · @Roshan

## Overview and UVP

This app plans a week of bulk-cooked lunches and dinners that hit a person's calorie target and stay inside a $60 to $70 AUD weekly budget. The AI designs just two recipes, one lunch and one dinner, each for one serving. They are cooked once as a batch of five servings and eaten Monday to Friday. Code works out every calorie, macro and dollar from real data, so the numbers are not AI guesses.

**UVP:** plan a week of meals that fits your body goal and your budget, cooked in one go, with numbers you can trace back to real nutrition data.

## Problem

Meal prepping saves time and money, but planning it is messy. In order of how much it hurts:

1. **Overspending.** There is no cost estimate before the weekly shop.
2. **Repeated meals.** Without a plan, the same few meals come around again and again.
3. **Lost ideas.** Recipe videos get saved on social media and are hard to find again.
4. **Working out macros by hand.** Calculating calories and protein for a week of meals is slow.

The pain peaks at two moments: before the weekly shop, and after a long shift when there is no energy to plan or cook.

Washing up is not a design goal. When meal prepping, the cooking and dishes happen once, so the app does not need to reduce them.

## Users

The primary user is a person on a budget who preps meals for the week and has little time to cook. The secondary user is a gym-goer who tracks calories and wants the plan to match a surplus or deficit.

| Current alternative | Gap |
| --- | --- |
| General chatbot | Suggests meals, but makes up macros and prices and does not remember last week's plan |
| TikTok and recipe videos | Hard to find again, with no macros, no cost and no weekly plan |

## Goals and success measures

Version 1 works if one person gets a full, accurate week plan in under two minutes at about $65 AUD.

| Measure | Target | How we test it |
| --- | --- | --- |
| Time to a full week plan | Under 2 minutes from opening the app | Stopwatch on 3 runs |
| Weekly cost | $60 to $70 AUD for one person, lunch and dinner, 5 days | Code sums the price list |
| Calorie and macro accuracy | Within 5% of a hand calculation | Hand-check 3 plans in a spreadsheet |
| Bulk cooking | The plan is exactly one lunch recipe and one dinner recipe, each cooked once as 5 servings | True by construction: code expands the two recipes into Mon to Fri |

## Scope

Version 1 covers one person's lunch and dinner for 5 days, with lunch and dinner set at 65% of the daily calorie target.

**In version 1**

- Profile form: weight, height, age, sex, activity level, goal (lose, maintain or gain).
- Code calculates the daily calorie target and macros from the profile.
- AI designs two recipes from a fixed ingredient list: one lunch and one dinner, each for one serving, each aiming for about half of the lunch-and-dinner calorie target. Code expands them into 5 identical days (Mon to Fri), so the shopping list and cost are for 5 servings of each recipe.
- Calories and macros for each recipe (per serving), each day and the week, and an estimated cost per serving, all calculated by code. The weekly cost counts whole packs.
- No variety rule: repeating the same two meals is the point of bulk cooking.
- A note that cooked meals keep about 3 to 4 days in the fridge, with a suggestion to freeze the last two days of portions.
- Shopping list with combined quantities and an estimated total.
- Plan saved in the browser.

**Out of version 1**

- Live supermarket prices.
- Breakfast and snacks.
- Dietary restrictions and allergies.
- Recipe videos or links.
- User accounts.

**First upgrade after launch:** swap one of the two recipes without regenerating the other.

## User flow

&#91;embedded content: user flow · 7 steps, 1 retry loop\]

The AI is called once per plan. Code checks calories and budget, and a plan over budget gets up to 2 rounds of cheaper-ingredient swaps before it is shown with a warning.

## How we keep the numbers trustworthy

The AI never supplies a number. It only picks meals, as ingredients and grams, and code does everything else.

1. **Code calculates the target.** A standard formula turns weight, height, age, sex, activity and goal into a daily calorie target. Lunch and dinner get 65% of it.
2. **AI designs two recipes from our ingredient list only.** One lunch and one dinner, each for one serving. Its output is limited to recipe names, ingredient ids and gram amounts.
3. **Code looks up nutrition and price.** Calories and macros come from a real food database, and prices come from our own price list. Code adds them up.
4. **Unknown ingredients are rejected.** If the AI uses something not in the database, the app flags or replaces it.
5. **Code checks the plan.** It expands the two recipes into five days, then compares the day's totals with the calorie target and checks the cost of the whole-pack shopping list against the budget. If the plan is over budget, the app swaps in cheaper ingredients, up to 2 times, then shows the plan with an "over budget by $X" note.
6. **Every number is traceable.** Each total can be broken down by ingredient.

**Trust test:** hand-check 3 generated plans in a spreadsheet. App totals should match within about 5%.

## Risks, decisions and open questions

The biggest risk is price accuracy, so it gets tested first.

| Risk | Why it matters | How we handle it |
| --- | --- | --- |
| Prices are estimates | There is no free API for Australian supermarket prices | Use our own price list, labelled "estimated, last updated \[date\]"; make it editable later |
| $6 to $7 per meal may not work with high-protein targets | The whole promise could fail | Test on paper in a spreadsheet before building |
| Nutrition data may not match Australian products | USDA data is US-based | Check Australian food composition data; start with about 50 to 80 common ingredients |
| AI builds boring meals or fails the checks | Bad plans lose trust | Limit it to our ingredient list, check in code, retry up to 2 times |
| Calorie formula is only an estimate | Wrong targets could mislead users | Cap the deficit and surplus; add a "not medical advice" line |
| Eating the same two meals all week gets boring | Variety is traded for time and cost | Say so up front; the first upgrade is swapping one recipe; the AI is asked for meals that keep and reheat well |
| Cooked food only keeps 3 to 4 days in the fridge | Days 4 and 5 may be unsafe or unpleasant | Show a note: keep 3 to 4 days in the fridge and consider freezing the last two days of portions |
| Free AI quota (about 20 requests a day) | Heavy use stops working | One request per plan, with a fallback model |
| Body details are personal | Weight and goals are sensitive | Keep everything in the browser with no accounts, and say so in the app |

**Decisions made**

- Primary user: a budget-conscious person who preps for the week. Gym-goers are secondary.
- Lunch and dinner are 65% of the daily calorie target; the user covers the rest.
- Weekly budget is $60 to $70 AUD.
- Over budget: auto-pick cheaper ingredients, then show a clear warning.
- Bulk cooking: the AI designs only two recipes (one lunch, one dinner, one serving each). Code expands them into Mon to Fri, so the same lunch and dinner are eaten every day. This replaces the earlier idea of ten different meals and a "no meal more than twice" rule.
- Lunch and dinner each aim for roughly half of the lunch-and-dinner calorie target.
- Swapping one of the two recipes comes after version 1.
- Dishes and cooking time are out of scope, because meal prepping cooks once.

**Open questions**

- Which nutrition database to use: USDA FoodData Central or Australian food composition data.
- How big the starting ingredient list should be, and where its prices come from.
