import { useState } from 'react'
import { money } from '../lib/format.js'
import { IconCart } from './Icons.jsx'

// Store sections, in the order you usually walk the shop (freezer last so things stay cold). Display only.
const AISLES = [
  { label: 'Fruit and veg', ids: ['potatoes'] },
  { label: 'Meat and fish', ids: ['chicken-breast', 'beef-mince', 'salmon'] },
  { label: 'Eggs', ids: ['eggs'] },
  { label: 'Pantry', ids: ['rice', 'pasta', 'red-lentils', 'tuna', 'diced-tomatoes', 'sunflower-oil'] },
  { label: 'Freezer', ids: ['frozen-mixed-veg', 'frozen-green-beans', 'frozen-peas'] },
]

// Ticks are remembered in this browser for the current plan only. A new plan starts with nothing ticked.
const TICKS_KEY = 'mealPlanner.shoppingTicks'
function loadTicks(planKey) {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(TICKS_KEY) || 'null')
    return new Set(saved && saved.planKey === planKey && Array.isArray(saved.ids) ? saved.ids : [])
  } catch {
    return new Set()
  }
}
function saveTicks(planKey, ticks) {
  try {
    globalThis.localStorage?.setItem(TICKS_KEY, JSON.stringify({ planKey, ids: [...ticks] }))
  } catch {
    // storage blocked: ticks just won't survive a refresh
  }
}

function buyText(line) {
  if (line.packs === null) return `${line.grams.toLocaleString('en-AU')} g by weight`
  return `${line.packs} × ${line.packGrams.toLocaleString('en-AU')} g`
}
function needText(line) {
  const need = `Need ${line.grams.toLocaleString('en-AU')} g`
  return line.leftoverGrams > 0 ? `${need} · ${line.leftoverGrams.toLocaleString('en-AU')} g spare` : need
}

function group(lines) {
  const known = new Set(AISLES.flatMap((a) => a.ids))
  const groups = AISLES.map((a) => ({ label: a.label, lines: lines.filter((l) => a.ids.includes(l.ingredientId)) }))
  groups.push({ label: 'Other', lines: lines.filter((l) => !known.has(l.ingredientId)) })
  return groups.filter((g) => g.lines.length > 0)
}

// planKey: identifies the plan, so ticks from an old plan are not shown on a new one.
export default function ShoppingList({ lines, total, servings, planKey }) {
  const [ticked, setTicked] = useState(() => loadTicks(planKey))
  const toggle = (id) => {
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveTicks(planKey, next)
      return next
    })
  }
  const clear = () => { setTicked(new Set()); saveTicks(planKey, new Set()) }
  const done = lines.filter((l) => ticked.has(l.ingredientId)).length

  return (
    <section className="card" id="shopping" aria-labelledby="shopping-title">
      <div className="card-head-row">
        <div className="card-head">
          <p className="eyebrow">For {servings} servings of each recipe</p>
          <h2 id="shopping-title">Shopping list</h2>
        </div>
        {done > 0 && <button type="button" className="button button-ghost button-sm" onClick={clear}>Untick all</button>}
      </div>

      <div className="shop-progress">
        <IconCart />
        <div className="bar" aria-hidden="true"><div className="bar-fill" style={{ width: `${lines.length ? (done / lines.length) * 100 : 0}%` }} /></div>
        <span className="shop-progress-text" aria-live="polite">
          {done === lines.length && lines.length > 0 ? 'All in the trolley' : `${done} of ${lines.length} in the trolley`}
        </span>
      </div>

      {group(lines).map((g) => (
        <div key={g.label} className="aisle">
          <h3 className="aisle-title">{g.label}</h3>
          <ul>
            {g.lines.map((line) => {
              const isDone = ticked.has(line.ingredientId)
              return (
                <li key={line.ingredientId}>
                  <label className={`shop-row${isDone ? ' is-done' : ''}`}>
                    <input type="checkbox" className="shop-check" checked={isDone} onChange={() => toggle(line.ingredientId)} />
                    <span className="shop-main">
                      <span className="shop-name">{line.name}</span>
                      <span className="shop-detail">{needText(line)}</span>
                    </span>
                    <span className="shop-buy">
                      <span className="shop-price">{money(line.cost)}</span>
                      <span className="shop-qty">{buyText(line)}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <div className="receipt-total">
        <span className="receipt-total-label">Total (whole packs)</span>
        <span>{money(total)}</span>
      </div>
    </section>
  )
}
