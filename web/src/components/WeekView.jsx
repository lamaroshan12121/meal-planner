import RecipeCard from './RecipeCard.jsx'
import { money, signedPercent } from '../lib/format.js'

// "Your week": the two recipes once, and what one day (lunch + dinner) adds up to. The same day repeats Mon to Fri.
// check: the result of checkRecipes. flagged: true if the calorie check found the day off target.
export default function WeekView({ check, flagged }) {
  const { lunch, dinner } = check.recipes
  const day = check.days[0]
  const estDayCost = lunch.estCost + dinner.estCost
  return (
    <section className="card" aria-labelledby="week-title">
      <h2 id="week-title">Your week</h2>
      <p><strong>Mon to Fri: this lunch and this dinner every day</strong></p>
      <p className="muted">Cook each recipe once as a batch of {check.servings} servings.</p>

      <RecipeCard recipe={lunch} />
      <RecipeCard recipe={dinner} />

      <div className="day-header">
        <h3>Each day</h3>
        <span className={`pill${flagged ? ' pill-warn' : ''}`}>
          {signedPercent(day.diffPct)} vs {day.targetKcal} kcal target
        </span>
      </div>
      <div className="meal-stats">
        <span>{day.totals.kcal} kcal</span>
        <span>{day.totals.protein} g protein</span>
        <span>{day.totals.carbs} g carbs</span>
        <span>{day.totals.fat} g fat</span>
        <span>est. {money(estDayCost)}</span>
      </div>

      <p className="banner banner-warn">Cooked meals generally keep 3 to 4 days in the fridge. Consider freezing the portions for the last two days.</p>
    </section>
  )
}
