// Small display helpers. No maths about food here: all numbers come from plan.js.
import { ingredients } from '../../../ingredients.js'

export const money = (n) => `$${n.toFixed(2)}`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2026-10-25" -> "25 Oct 2026"
export function formatPriceDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

// ISO timestamp -> "25 Oct 2026, 3:42 pm" in the viewer's own time zone.
export function formatSavedAt(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const time = date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${time}`
}

export const signedPercent = (n) => `${n > 0 ? '+' : ''}${n}%`

export const SLOT_NAMES = { lunch: 'Lunch', dinner: 'Dinner' }

export const PROBLEM_TITLES = {
  'over-budget': 'Over budget',
  'day-calories': 'Calories off target',
  'unknown-ingredient': 'Unknown ingredient',
  'bad-grams': 'Bad amount',
}

// Rice, pasta and lentils are measured dry. Their names already say "(dry weight)"; add it if a name ever does not.
const stateById = new Map(ingredients.map((i) => [i.id, i.state]))
export function itemLabel(item) {
  const dry = stateById.get(item.ingredientId) === 'dry'
  return dry && !/dry weight/i.test(item.name) ? `${item.name} (dry weight)` : item.name
}
