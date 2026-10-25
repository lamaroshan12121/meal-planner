import { PROBLEM_TITLES } from '../lib/format.js'
import { IconAlert } from './Icons.jsx'

// Friendly wording for what the checks found. The exact message from the check is kept underneath.
// (Over-budget is shown in the "This week" card, so Results leaves it out of this list.)
const COPY = {
  'day-calories': (p) => ({
    title: p.direction === 'under' ? 'A little light on calories' : 'More calories than your target',
    help: 'The rest of the plan still works. Generate a new plan for a closer match, or adjust the portions yourself.',
  }),
  'unknown-ingredient': () => ({
    title: "One ingredient isn't on our price list",
    help: "It's left out of the calories, the cost and the shopping list.",
  }),
  'bad-grams': () => ({
    title: 'An amount looks wrong',
    help: "It's left out of the totals.",
  }),
}

export default function Problems({ problems }) {
  if (problems.length === 0) return null
  return (
    <section className="card" aria-labelledby="problems-title">
      <h2 id="problems-title">{problems.length === 1 ? 'One thing to know' : `${problems.length} things to know`}</h2>
      <ul className="problem-list">
        {problems.map((p, i) => {
          const copy = COPY[p.type]?.(p) || { title: PROBLEM_TITLES[p.type] || 'Something to check', help: '' }
          return (
            <li key={i} className="notice notice-warn">
              <span className="notice-icon"><IconAlert /></span>
              <div className="notice-body">
                <span className="notice-title">{copy.title}</span>
                {copy.help && <span>{copy.help}</span>}
                <span className="notice-detail">{p.message}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
