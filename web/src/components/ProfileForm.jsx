import { useState } from 'react'
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, SEX_OPTIONS, validateForm } from '../lib/profile.js'
import { IconAlert, IconLock } from './Icons.jsx'

// Short labels for the goal buttons (the values are the same as GOAL_OPTIONS).
const GOAL_COPY = {
  lose: { label: 'Lose', sub: 'Slim down' },
  maintain: { label: 'Maintain', sub: 'Stay steady' },
  gain: { label: 'Gain', sub: 'Build up' },
}
const BUDGET_PRESETS = ['60', '65', '70']

// Sensible starting choices for a new user. Sex has no default: it is personal, so the user picks it.
const withDefaults = (form) => ({ ...form, activity: form.activity || 'moderate', goal: form.goal || 'maintain' })

function NumberField({ id, label, unit, value, onChange, error, inputMode = 'decimal' }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          id={id}
          className="input input-has-unit"
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          value={value}
          onChange={onChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : `${id}-unit`}
        />
        <span className="input-unit" id={`${id}-unit`}>{unit}</span>
      </div>
      {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
    </div>
  )
}

// Real radio buttons, styled as a segmented control or a list of options.
function ChoiceGroup({ name, label, hint, options, value, onChange, error, variant = 'segmented' }) {
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <span className="field-label" id={`${name}-label`}>{label}</span>
      {hint && <span className="field-hint" id={`${name}-hint`}>{hint}</span>}
      <div
        role="radiogroup"
        aria-labelledby={`${name}-label`}
        aria-describedby={describedBy}
        className={`${variant === 'list' ? 'option-list' : 'segmented'}${error ? ' is-invalid' : ''}`}
      >
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input type="radio" name={name} id={`${name}-${o.value}`} value={o.value} checked={value === o.value} onChange={onChange} />
            <span className="choice-face">
              <span>{o.label}</span>
              {o.sub && <span className="choice-sub">{o.sub}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && <span className="field-error" id={`${name}-error`}>{error}</span>}
    </div>
  )
}

// Form values are strings. On submit they are checked with the same rules as the server (calculateTargets).
export default function ProfileForm({ initialForm, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => withDefaults(initialForm))
  const [errors, setErrors] = useState({})

  const setValue = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }))
    setErrors((e) => ({ ...e, [name]: undefined }))
  }
  const set = (name) => (event) => setValue(name, event.target.value)

  function handleSubmit(event) {
    event.preventDefault()
    const result = validateForm(form)
    if (!result.ok) return setErrors(result.errors)
    setErrors({})
    onSubmit({ form, profile: result.profile, budget: result.budget })
  }

  const hasErrors = Object.values(errors).some(Boolean)
  const goalOptions = GOAL_OPTIONS.map((o) => ({ value: o.value, ...(GOAL_COPY[o.value] || { label: o.label }) }))

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate aria-labelledby="form-title">
      <div className="card-head">
        <h2 id="form-title">Your details</h2>
        <p className="muted">Seven quick answers. We work out your calories from them.</p>
      </div>

      <div className="field-row-3">
        <NumberField id="weightKg" label="Weight" unit="kg" value={form.weightKg} onChange={set('weightKg')} error={errors.weightKg} />
        <NumberField id="heightCm" label="Height" unit="cm" value={form.heightCm} onChange={set('heightCm')} error={errors.heightCm} />
        <NumberField id="age" label="Age" unit="yrs" inputMode="numeric" value={form.age} onChange={set('age')} error={errors.age} />
      </div>

      <ChoiceGroup name="sex" label="Sex" hint="Only used in the calorie formula." options={SEX_OPTIONS} value={form.sex} onChange={set('sex')} error={errors.sex} />

      <ChoiceGroup name="activity" label="How active are you?" variant="list" options={ACTIVITY_OPTIONS} value={form.activity} onChange={set('activity')} error={errors.activity} />

      <ChoiceGroup name="goal" label="Goal" options={goalOptions} value={form.goal} onChange={set('goal')} error={errors.goal} />

      <div className="field">
        <label className="field-label" htmlFor="budget">Weekly budget</label>
        <span className="field-hint" id="budget-hint">Lunch and dinner, Monday to Friday, in AUD.</span>
        <div className="input-wrap">
          <span className="input-prefix" aria-hidden="true">$</span>
          <input
            id="budget"
            className="input input-has-prefix"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={form.budget}
            onChange={set('budget')}
            aria-invalid={errors.budget ? 'true' : 'false'}
            aria-describedby={errors.budget ? 'budget-hint budget-error' : 'budget-hint'}
          />
        </div>
        <div className="chip-row" role="group" aria-label="Quick budgets">
          {BUDGET_PRESETS.map((b) => (
            <button key={b} type="button" className="chip" aria-pressed={String(form.budget) === b} onClick={() => setValue('budget', b)}>
              ${b}
            </button>
          ))}
        </div>
        {errors.budget && <span className="field-error" id="budget-error">{errors.budget}</span>}
      </div>

      {hasErrors && (
        <p className="form-error" role="alert"><IconAlert /> Please fix the highlighted fields.</p>
      )}

      <div className="form-actions">
        <button type="submit" className="button button-lg button-block">Build my plan</button>
        {onCancel && <button type="button" className="button button-ghost button-block" onClick={onCancel}>Back to my plan</button>}
      </div>

      <p className="privacy"><IconLock /> Your details stay in this browser. Only the numbers above are sent to build the plan.</p>
    </form>
  )
}
