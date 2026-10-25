// localStorage, wrapped so a blocked or full store never breaks the app (private windows, blocked site data).
// Everything stays in the browser: there are no accounts and nothing is sent anywhere except the profile to /api/plan.

const FORM_KEY = 'mealPlanner.form'
const PLAN_KEY = 'mealPlanner.plan'

function getStorage() {
  try {
    return globalThis.localStorage || null
  } catch {
    return null
  }
}

function read(key, storage = getStorage()) {
  try {
    const text = storage?.getItem(key)
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

function write(key, value, storage = getStorage()) {
  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const loadForm = (storage) => {
  const form = read(FORM_KEY, storage)
  return form && typeof form === 'object' ? form : null
}
export const saveForm = (form, storage) => write(FORM_KEY, form, storage)

// A saved plan record: { savedAt, source: "ai", form, profile, budget, recipes, attempts }. recipes = { lunch, dinner }, one serving each.
// Only the AI's meal choices are stored. Calories, macros and costs are recalculated by code every time it is shown.
export function loadPlanRecord(storage) {
  const record = read(PLAN_KEY, storage)
  const ok = record && record.profile && typeof record.budget === 'number' && record.recipes?.lunch && record.recipes?.dinner
  return ok ? record : null
}
export const savePlanRecord = (record, storage) => write(PLAN_KEY, record, storage)
