// Turns a plan record into everything the screen shows, using the same code as the server (targets.js, plan.js).
import { calculateTargets } from '../../../targets.js'
import { checkRecipes } from '../../../plan.js'

// record: { profile, budget, recipes }. recipes = { lunch, dinner }, one serving each (bulk cooking).
// Returns { targets, check } or null if the record is unusable.
export function buildResult(record) {
  if (!record) return null
  const targets = calculateTargets(record.profile)
  if (!targets.ok) return null
  const check = checkRecipes(record.recipes, targets.lunchDinner, record.budget, undefined, { goal: record.profile.goal })
  if (!check.ok) return null
  return { targets, check }
}
