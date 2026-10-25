import { KCAL_LIMITS } from '../../../plan.js'
import { money, signedPercent } from '../lib/format.js'
import { IconFlame, IconMuscle, IconWallet } from './Icons.jsx'

// "This week at a glance": cost against budget, calories against target, protein. Display only: every number comes in
// from checkRecipes / calculateTargets; this just draws them.
const fmt = (n) => n.toLocaleString('en-AU')
const clampPct = (x) => Math.min(100, Math.max(0, x))

function BudgetMeter({ cost }) {
  const over = cost.overBy > 0
  const left = cost.budget - cost.total
  const fill = clampPct((cost.total / cost.budget) * 100)
  return (
    <div className="metric">
      <div className="metric-top">
        <span className="metric-label"><IconWallet /> Weekly shop</span>
        <span className={`status ${over ? 'status-danger' : 'status-ok'}`}>{over ? 'Over budget' : 'Within budget'}</span>
      </div>
      <p className="metric-value">{money(cost.total)}<span className="metric-unit">of {money(cost.budget)}</span></p>
      <div className="bar" aria-hidden="true"><div className={`bar-fill${over ? ' is-over' : ''}`} style={{ width: `${fill}%` }} /></div>
      {over
        ? <p className="metric-sub metric-sub-danger">Over budget by <strong>{money(cost.overBy)}</strong></p>
        : <p className="metric-sub"><strong>{money(left)}</strong> left in your budget</p>}
    </div>
  )
}

// A scale around the target: the green band is the allowed range for this goal, the line is the target, the dot is the plan.
function CalorieMeter({ day, goal, problem }) {
  const limits = KCAL_LIMITS[goal] || KCAL_LIMITS.maintain
  const target = day.targetKcal
  const low = target * (1 - limits.under)
  const high = target * (1 + limits.over)
  const min = target * (1 - limits.under - 0.2)
  const max = target * (1 + limits.over + 0.2)
  const pos = (v) => clampPct(((v - min) / (max - min)) * 100)
  const status = !problem
    ? { cls: 'status-ok', text: 'On target' }
    : { cls: 'status-warn', text: problem.direction === 'under' ? 'Too low' : 'Too high' }
  const allowed = goal === 'gain' ? 'Going over is fine when gaining (up to +50%).' : 'Aim within 10% either way.'
  return (
    <div className="metric">
      <div className="metric-top">
        <span className="metric-label"><IconFlame /> Calories per day</span>
        <span className={`status ${status.cls}`}>{status.text}</span>
      </div>
      <p className="metric-value">{fmt(day.totals.kcal)}<span className="metric-unit">kcal</span></p>
      <div className="scale" aria-hidden="true">
        <div className="scale-band" style={{ left: `${pos(low)}%`, width: `${pos(high) - pos(low)}%` }} />
        <div className="scale-target" style={{ left: `${pos(target)}%` }} />
        <div className={`scale-dot${problem ? ' is-off' : ''}`} style={{ left: `${pos(day.totals.kcal)}%` }} />
      </div>
      <p className="metric-sub">Target <strong>{fmt(target)} kcal</strong> ({signedPercent(day.diffPct)}). {allowed}</p>
    </div>
  )
}

function ProteinMeter({ protein, target }) {
  const met = protein >= target
  const fill = clampPct((protein / target) * 100)
  return (
    <div className="metric metric-wide">
      <div className="metric-top">
        <span className="metric-label"><IconMuscle /> Protein per day</span>
        <span className={`status ${met ? 'status-ok' : 'status-warn'}`}>{met ? 'Target hit' : 'Below target'}</span>
      </div>
      <p className="metric-value">{protein} g<span className="metric-unit">target {target} g or more</span></p>
      <div className="bar" aria-hidden="true"><div className={`bar-fill${met ? '' : ' is-short'}`} style={{ width: `${fill}%` }} /></div>
    </div>
  )
}

// day: check.days[0] (every day is the same). dayProblem: the day-calories problem, if any.
export default function PlanSummary({ cost, attempts, day, goal, dayProblem, proteinTarget }) {
  return (
    <section className="card" aria-labelledby="glance-title">
      <div className="card-head">
        <p className="eyebrow">At a glance</p>
        <h2 id="glance-title">This week</h2>
      </div>
      <div className="glance-grid">
        <BudgetMeter cost={cost} />
        {day && <CalorieMeter day={day} goal={goal} problem={dayProblem} />}
        {day && proteinTarget > 0 && <ProteinMeter protein={day.totals.protein} target={proteinTarget} />}
      </div>
      {attempts > 1 && <p className="attempts">The AI needed {attempts} attempts to get here.</p>}
    </section>
  )
}
