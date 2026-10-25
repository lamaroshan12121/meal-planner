import { money } from '../lib/format.js'

function amount(line) {
  if (line.packs === null) return `${line.grams} g by weight`
  return `${line.packs} × ${line.packGrams} g pack${line.packs === 1 ? '' : 's'}`
}

export default function ShoppingList({ lines, total, servings }) {
  return (
    <section className="card" aria-labelledby="shopping-title">
      <h2 id="shopping-title">Shopping list</h2>
      <p className="muted">For {servings} servings of each recipe (Mon to Fri). Whole packs.</p>
      <ul className="list-rows">
        {lines.map((line) => (
          <li key={line.ingredientId} className="list-row">
            <span className="list-row-main">
              <span>{line.name}</span>
              <span className="muted">
                Need {line.grams} g
                {line.leftoverGrams > 0 ? `, ${line.leftoverGrams} g left over` : ''}
              </span>
            </span>
            <span className="list-row-amount">{amount(line)} · {money(line.cost)}</span>
          </li>
        ))}
        <li className="list-row list-row-total">
          <span>Total (whole packs)</span>
          <span className="list-row-amount">{money(total)}</span>
        </li>
      </ul>
    </section>
  )
}
