import { GOAL_OPTIONS, labelFor } from '../lib/profile.js'

const fmt = (n) => n.toLocaleString('en-AU')

// targets: the result of calculateTargets
export default function TargetsSummary({ targets, goal }) {
  const rows = [
    { label: 'Whole day', v: targets.daily },
    { label: 'Lunch + dinner (65%)', v: targets.lunchDinner },
  ]
  return (
    <section className="card" aria-labelledby="targets-title">
      <div className="card-head">
        <p className="eyebrow">Goal: {labelFor(GOAL_OPTIONS, goal)}</p>
        <h2 id="targets-title">Your targets</h2>
      </div>
      <div className="table-scroll">
        <table className="targets-table">
          <thead>
            <tr><th scope="col">Per day</th><th scope="col">kcal</th><th scope="col">Protein</th><th scope="col">Carbs</th><th scope="col">Fat</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>{fmt(r.v.kcal)}</td><td>{r.v.protein} g</td><td>{r.v.carbs} g</td><td>{r.v.fat} g</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">Maintenance is about {fmt(targets.maintenanceKcal)} kcal a day. Breakfast and snacks cover the other 35%.</p>
      {targets.notes.map((note) => <p key={note} className="notice notice-warn">{note}</p>)}
    </section>
  )
}
