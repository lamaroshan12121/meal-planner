// Calls the serverless function. The only thing the browser sends is the profile and budget.
export async function requestPlan({ profile, budget, signal }) {
  let res
  try {
    res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, budget }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error("Couldn't reach the planner. Check your connection and try again.")
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // not JSON (for example the dev server could not reach the API)
  }

  if (!res.ok || !data) {
    const detail = Array.isArray(data?.details) ? ` ${data.details.join(' ')}` : ''
    throw new Error((data?.error || `The planner returned an error (${res.status}). Try again in a minute.`) + detail)
  }
  if (!data.recipes) throw new Error('The planner did not return a plan. Try again.')
  return data // { targets, recipes, plan, check, shoppingList, attempts, passes }
}
