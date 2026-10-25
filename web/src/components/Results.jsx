import TargetsSummary from './TargetsSummary.jsx'
import PlanSummary from './PlanSummary.jsx'
import Problems from './Problems.jsx'
import WeekView from './WeekView.jsx'
import ShoppingList from './ShoppingList.jsx'
import Notice from './Notice.jsx'
import { formatSavedAt } from '../lib/format.js'

// record: the saved (or sample) plan. result: { targets, check } from buildResult.
export default function Results({ record, result, onNewPlan, onCloseSample }) {
  const { targets, check } = result
  const isSample = record.source === 'sample'
  const dayFlagged = check.problems.some((p) => p.type === 'day-calories')
  // Over-budget has its own banner in the cost card, so the list shows only the other problems.
  const otherProblems = check.problems.filter((p) => p.type !== 'over-budget')

  return (
    <>
      <header className="page-header">
        <h1>Your week of meals</h1>
        {isSample
          ? <p className="muted">Sample plan: made from test data, not saved, no AI used.</p>
          : <p className="muted">Plan made {formatSavedAt(record.savedAt)}</p>}
      </header>

      {isSample && (
        <div className="banner banner-warn">
          <strong>Sample plan</strong>
          This is for previewing the design.{' '}
          <button type="button" className="button button-secondary" onClick={onCloseSample}>Close sample</button>
        </div>
      )}

      <PlanSummary cost={check.cost} attempts={isSample ? 0 : record.attempts} />
      {check.passes && <div className="banner banner-ok"><strong>All checks passed</strong>Calories and budget are on track.</div>}
      <Problems problems={otherProblems} />
      <TargetsSummary targets={targets} goal={record.profile.goal} />
      <WeekView check={check} flagged={dayFlagged} />
      <ShoppingList lines={check.shoppingList} total={check.cost.total} servings={check.servings} />
      <Notice />
      <div className="button-row">
        <button type="button" className="button" onClick={onNewPlan}>Generate a new plan</button>
      </div>
    </>
  )
}
