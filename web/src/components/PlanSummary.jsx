import { money } from '../lib/format.js'

// Weekly cost (whole packs) against the budget.
export default function PlanSummary({ cost, attempts }) {
  const over = cost.overBy > 0
  const left = cost.budget - cost.total
  return (
    <section className="card" aria-labelledby="cost-title">
      <h2 id="cost-title">Weekly cost</h2>
      <div className="stat-grid">
        <div className="stat"><span className="stat-value">{money(cost.total)}</span><span className="stat-label">whole packs</span></div>
        <div className="stat"><span className="stat-value">{money(cost.budget)}</span><span className="stat-label">budget</span></div>
      </div>
      {over
        ? <div className="banner banner-danger" role="alert"><strong>Over budget by {money(cost.overBy)}</strong>The plan costs more than your budget. You could swap some meals for cheaper ones.</div>
        : <div className="banner banner-ok"><strong>Within budget</strong>{money(left)} to spare.</div>}
      {attempts > 1 && <p className="muted">The AI needed {attempts} attempts to get here.</p>}
    </section>
  )
}
