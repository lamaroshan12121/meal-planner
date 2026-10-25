import TargetsSummary from './TargetsSummary.jsx'
import PlanSummary from './PlanSummary.jsx'
import Problems from './Problems.jsx'
import WeekView from './WeekView.jsx'
import ShoppingList from './ShoppingList.jsx'
import Notice from './Notice.jsx'
import { formatSavedAt } from '../lib/format.js'
import { IconCart, IconCheck, IconPot, IconRefresh } from './Icons.jsx'

// record: the saved (or sample) plan. result: { targets, check } from buildResult.
export default function Results({ record, result, onNewPlan, onCloseSample }) {
  const { targets, check } = result
  const isSample = record.source === 'sample'
  const dayProblem = check.problems.find((p) => p.type === 'day-calories')
  // Over-budget has its own line in the "This week" card, so the list shows only the other problems.
  const otherProblems = check.problems.filter((p) => p.type !== 'over-budget')
  // Shopping ticks belong to one plan; a new plan (or another sample) starts unticked.
  const planKey = isSample ? `sample:${check.recipes.lunch.name}|${check.recipes.dinner.name}` : `saved:${record.savedAt}`

  return (
    <div className="results">
      <header className="results-head">
        {isSample ? (
          <div className="sample-pill">
            <span>Sample plan: test data, not saved, no AI used</span>
            <button type="button" className="button button-ghost button-sm" onClick={onCloseSample}>Close sample</button>
          </div>
        ) : (
          <p className="eyebrow">Plan made {formatSavedAt(record.savedAt)}</p>
        )}
        <h1>Your week of meals</h1>
      </header>

      <div className="results-grid">
        <div className="results-main">
          <PlanSummary
            cost={check.cost}
            attempts={isSample ? 0 : record.attempts}
            day={check.days[0]}
            goal={record.profile.goal}
            dayProblem={dayProblem}
            proteinTarget={targets.lunchDinner.protein}
          />
          {check.passes && (
            <div className="notice notice-ok">
              <span className="notice-icon"><IconCheck /></span>
              <div className="notice-body">
                <span className="notice-title">All checks passed</span>
                <span className="notice-detail">Calories and budget are on track.</span>
              </div>
            </div>
          )}
          <Problems problems={otherProblems} />
          <WeekView check={check} flagged={Boolean(dayProblem)} />
        </div>

        <div className="results-side">
          <ShoppingList key={planKey} planKey={planKey} lines={check.shoppingList} total={check.cost.total} servings={check.servings} />
          <TargetsSummary targets={targets} goal={record.profile.goal} />
          <Notice />
          <button type="button" className="button button-secondary button-block" onClick={onNewPlan}>Generate a new plan</button>
        </div>
      </div>

      <nav className="bottom-nav" aria-label="Jump to">
        <a href="#week" className="bottom-nav-link"><IconPot />Recipes</a>
        <a href="#shopping" className="bottom-nav-link"><IconCart />Shopping</a>
        <button type="button" className="bottom-nav-link" onClick={onNewPlan}><IconRefresh />New plan</button>
      </nav>
    </div>
  )
}
