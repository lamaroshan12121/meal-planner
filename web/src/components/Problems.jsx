import { PROBLEM_TITLES } from '../lib/format.js'

// Anything the checks found, in plain language. (Over-budget is shown in the cost card, so Results leaves it out of this list.)
export default function Problems({ problems }) {
  if (problems.length === 0) return null
  return (
    <section className="card" aria-labelledby="problems-title">
      <h2 id="problems-title">Things to check</h2>
      <ul className="problem-list">
        {problems.map((p, i) => (
          <li key={i} className="banner banner-warn">
            <strong>{PROBLEM_TITLES[p.type] || 'Problem'}</strong>
            {p.message}
          </li>
        ))}
      </ul>
    </section>
  )
}
