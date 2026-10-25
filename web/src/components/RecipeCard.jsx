import { money, itemLabel, SLOT_NAMES } from '../lib/format.js'

// One recipe (lunch or dinner). Bulk cooking: the grams are shown for ONE serving and for the whole BATCH (x servings).
// recipe: check.recipes.lunch or check.recipes.dinner.
export default function RecipeCard({ recipe }) {
  return (
    <div className="meal">
      <span className="meal-slot">{SLOT_NAMES[recipe.slot]}</span>
      <h3>{recipe.name}</h3>
      <table className="recipe-table">
        <thead>
          <tr>
            <th scope="col">Ingredient</th>
            <th scope="col">1 serving</th>
            <th scope="col">Batch (×{recipe.servings})</th>
          </tr>
        </thead>
        <tbody>
          {recipe.items.map((item) => (
            <tr key={item.ingredientId}>
              <td>{itemLabel(item)}</td>
              <td>{item.grams} g</td>
              <td>{item.batchGrams} g</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="meal-stats">
        <span>{recipe.totals.kcal} kcal per serving</span>
        <span>{recipe.totals.protein} g protein</span>
        <span title="Estimate: grams used as a share of the pack price">est. {money(recipe.estCost)} per serving</span>
      </div>
    </div>
  )
}
