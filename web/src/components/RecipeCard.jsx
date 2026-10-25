import { money, itemLabel, SLOT_NAMES } from '../lib/format.js'

const fmt = (n) => n.toLocaleString('en-AU')

// One recipe (lunch or dinner). Bulk cooking: the grams are shown for ONE serving and for the whole BATCH (x servings).
// recipe: check.recipes.lunch or check.recipes.dinner.
export default function RecipeCard({ recipe }) {
  const titleId = `recipe-${recipe.slot}`
  return (
    <article className="recipe" aria-labelledby={titleId}>
      <div className="recipe-head">
        <span className={`tag tag-${recipe.slot}`}>{SLOT_NAMES[recipe.slot]}</span>
        <h3 id={titleId} className="recipe-name">{recipe.name}</h3>
        <ul className="recipe-stats" aria-label="Per serving">
          <li className="stat-chip"><strong>{fmt(recipe.totals.kcal)}</strong> kcal</li>
          <li className="stat-chip"><strong>{recipe.totals.protein} g</strong> protein</li>
          <li className="stat-chip" title="Estimate: grams used as a share of the pack price"><strong>~{money(recipe.estCost)}</strong></li>
          <li className="muted">per serving</li>
        </ul>
      </div>
      <div className="table-scroll">
        <table className="recipe-table">
          <caption className="sr-only">{recipe.name}: grams for one serving and for the whole batch</caption>
          <thead>
            <tr>
              <th scope="col">Ingredient</th>
              <th scope="col" className="col-num">1 serving</th>
              <th scope="col" className="col-num col-batch">Batch ×{recipe.servings}</th>
            </tr>
          </thead>
          <tbody>
            {recipe.items.map((item) => (
              <tr key={item.ingredientId}>
                <td>{itemLabel(item)}</td>
                <td className="col-num">{fmt(item.grams)} g</td>
                <td className="col-num col-batch">{fmt(item.batchGrams)} g</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}
