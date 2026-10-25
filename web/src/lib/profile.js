// The profile form: options, and validation that reuses the same rules as calculateTargets (targets.js).
import { calculateTargets } from '../../../targets.js'

// Values must match ACTIVITY_MULTIPLIERS in targets.js.
export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Little or no exercise' },
  { value: 'light', label: 'Trains 1 to 3 days a week' },
  { value: 'moderate', label: 'Trains 3 to 5 days a week' },
  { value: 'active', label: 'Trains 6 to 7 days a week' },
  { value: 'very_active', label: 'Hard training plus a physical job' },
]

export const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export const GOAL_OPTIONS = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain weight' },
  { value: 'gain', label: 'Gain weight' },
]

export const DEFAULT_BUDGET = 65
export const BUDGET_LIMITS = [10, 500]

// Form values are strings, because that is what inputs give us.
export const EMPTY_FORM = { weightKg: '', heightCm: '', age: '', sex: '', activity: '', goal: '', budget: String(DEFAULT_BUDGET) }

const BLANK_MESSAGES = {
  weightKg: 'Enter your weight in kg.',
  heightCm: 'Enter your height in cm.',
  age: 'Enter your age in years.',
  sex: 'Choose male or female.',
  activity: 'Choose how active you are.',
  goal: 'Choose a goal.',
  budget: 'Enter your weekly budget in dollars.',
}

const FIELD_BY_PREFIX = { Weight: 'weightKg', Height: 'heightCm', Age: 'age', Sex: 'sex', Activity: 'activity', Goal: 'goal' }
const fieldForError = (message) => FIELD_BY_PREFIX[message.split(' ')[0]] || 'form'

const isBlank = (v) => v === undefined || v === null || String(v).trim() === ''
const toNumber = (v) => (isBlank(v) ? NaN : Number(v))

// Returns { ok: true, profile, budget } or { ok: false, errors: { fieldName: message } }.
export function validateForm(form) {
  const errors = {}
  const profile = {
    weightKg: toNumber(form.weightKg),
    heightCm: toNumber(form.heightCm),
    age: toNumber(form.age),
    sex: form.sex,
    activity: form.activity,
    goal: form.goal,
  }

  // Same rules as the server uses (ranges, allowed words). A blank field gets a friendlier message than "must be a number".
  const result = calculateTargets(profile)
  if (!result.ok) {
    for (const message of result.errors) {
      const field = fieldForError(message)
      if (errors[field]) continue
      errors[field] = isBlank(form[field]) ? BLANK_MESSAGES[field] || message : message
    }
  }

  const budget = toNumber(form.budget)
  const [lo, hi] = BUDGET_LIMITS
  if (isBlank(form.budget)) errors.budget = BLANK_MESSAGES.budget
  else if (!Number.isFinite(budget) || budget < lo || budget > hi) errors.budget = `Budget must be between $${lo} and $${hi}.`

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, profile, budget }
}

export const labelFor = (options, value) => options.find((o) => o.value === value)?.label || value
