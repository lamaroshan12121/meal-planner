// Sample plans for designing the screens. They come from the test fixtures and are checked in the browser by checkRecipes.
// No API call is made, so no Gemini quota is used.
import { goodRecipes, salmonRecipes, messyRecipes } from '../../../test-fixtures.js'

// The example person from earlier stages: lunch and dinner target works out to 1,767 kcal.
export const SAMPLE_PROFILE = { weightKg: 57, heightCm: 175.3, age: 22, sex: 'male', activity: 'moderate', goal: 'gain' }
export const SAMPLE_BUDGET = 65

export const SAMPLE_VARIANTS = [
  { key: 'good', label: 'Good plan (about $38.98, no problems)', recipes: goodRecipes },
  { key: 'over', label: 'Over budget (about $84.38)', recipes: salmonRecipes },
  { key: 'problems', label: 'Has problems (unknown ingredient, off-target day)', recipes: messyRecipes },
]

export function buildSample(key) {
  const variant = SAMPLE_VARIANTS.find((v) => v.key === key) || SAMPLE_VARIANTS[0]
  return { source: 'sample', savedAt: null, profile: SAMPLE_PROFILE, budget: SAMPLE_BUDGET, recipes: variant.recipes() }
}
