import { GOAL_OPTIONS, labelFor } from '../lib/profile.js'

function Block({ title, values }) {
  return (
    <div className="target-block">
      <h3>{title}</h3>
      <div className="stat-grid">
        <div className="stat"><span className="stat-value">{values.kcal}</span><span className="stat-label">kcal</span></div>
        <div className="stat"><span className="stat-value">{values.protein} g</span><span className="stat-label">protein</span></div>
        <div className="stat"><span className="stat-value">{values.carbs} g</span><span className="stat-label">carbs</span></div>
        <div className="stat"><span className="stat-value">{values.fat} g</span><span className="stat-label">fat</span></div>
      </div>
    </div>
  )
}

// targets: the result of calculateTargets
export default function TargetsSummary({ targets, goal }) {
  return (
    <section className="card" aria-labelledby="targets-title">
      <h2 id="targets-title">Your targets</h2>
      <p className="muted">Goal: {labelFor(GOAL_OPTIONS, goal)}. Maintenance is about {targets.maintenanceKcal} kcal a day.</p>
      <Block title="Whole day" values={targets.daily} />
      <Block title="Lunch and dinner (65% of the day)" values={targets.lunchDinner} />
      {targets.notes.map((note) => <p key={note} className="banner banner-warn">{note}</p>)}
    </section>
  )
}
