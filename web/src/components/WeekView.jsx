import RecipeCard from './RecipeCard.jsx'
import { money, signedPercent } from '../lib/format.js'
import { IconSnow } from './Icons.jsx'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const FREEZE_FROM = 3 // Thu and Fri: cooked food keeps 3 to 4 days, so these portions go in the freezer
const fmt = (n) => n.toLocaleString('en-AU')

// "Your week": the two recipes once, and what one day (lunch + dinner) adds up to. The same day repeats Mon to Fri.
// check: the result of checkRecipes. flagged: true if the calorie check found the day off target.
export default function WeekView({ check, flagged }) {
  const { lunch, dinner } = check.recipes
  const day = check.days[0]
  const estDayCost = lunch.estCost + dinner.estCost
  return (
    <section className="card" id="week" aria-labelledby="week-title">
      <div className="card-head">
        <p className="eyebrow">Cook once, eat all week</p>
        <h2 id="week-title">Your week</h2>
      </div>

      <p className="lead-line">Mon to Fri: this lunch and this dinner every day</p>
      <ol className="week-strip" aria-label="Monday to Friday">
        {DAYS.map((d, i) => (
          <li key={d} className={`week-day${i >= FREEZE_FROM ? ' is-freeze' : ''}`}>
            <span className="week-day-name">{d}</span>
            <span className="week-day-meals">{i >= FREEZE_FROM ? <IconSnow width="1.1em" height="1.1em" /> : 'L + D'}</span>
            {i >= FREEZE_FROM && <span className="sr-only">(freeze these portions)</span>}
          </li>
        ))}
      </ol>
      <p className="week-legend"><IconSnow /> Thu and Fri: freeze those portions on cook day.</p>
      <p className="muted">Cook each recipe once as a batch of {check.servings} servings.</p>

      <div className="recipes">
        <RecipeCard recipe={lunch} />
        <RecipeCard recipe={dinner} />
      </div>

      <div className="day-total">
        <div className="day-total-head">
          <h3>Each day</h3>
          <span className={`status ${flagged ? 'status-warn' : 'status-ok'}`}>
            {signedPercent(day.diffPct)} vs {fmt(day.targetKcal)} kcal target
          </span>
        </div>
        <div className="day-total-grid">
          <div className="mini-stat"><span className="mini-stat-value">{fmt(day.totals.kcal)}</span><span className="mini-stat-label">kcal</span></div>
          <div className="mini-stat"><span className="mini-stat-value">{day.totals.protein} g</span><span className="mini-stat-label">protein</span></div>
          <div className="mini-stat"><span className="mini-stat-value">{day.totals.carbs} g</span><span className="mini-stat-label">carbs</span></div>
          <div className="mini-stat"><span className="mini-stat-value">{day.totals.fat} g</span><span className="mini-stat-label">fat</span></div>
          <div className="mini-stat"><span className="mini-stat-value">~{money(estDayCost)}</span><span className="mini-stat-label">est. per day</span></div>
        </div>
      </div>

      <div className="notice notice-freeze">
        <span className="notice-icon"><IconSnow /></span>
        <p>Cooked meals generally keep 3 to 4 days in the fridge. Consider freezing the portions for the last two days.</p>
      </div>
    </section>
  )
}
