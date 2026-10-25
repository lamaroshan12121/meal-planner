import { useState } from 'react'
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, SEX_OPTIONS, validateForm } from '../lib/profile.js'

function Field({ id, label, hint, error, wide, children }) {
  return (
    <div className={`field${wide ? ' field-wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="muted" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="field-error" id={`${id}-error`} role="alert">{error}</span>}
    </div>
  )
}

// Form values are strings. On submit they are checked with the same rules as the server (calculateTargets).
export default function ProfileForm({ initialForm, onSubmit, onCancel }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})

  const set = (name) => (event) => {
    setForm((f) => ({ ...f, [name]: event.target.value }))
    setErrors((e) => ({ ...e, [name]: undefined }))
  }
  const aria = (name) => ({
    'aria-invalid': errors[name] ? 'true' : 'false',
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  })

  function handleSubmit(event) {
    event.preventDefault()
    const result = validateForm(form)
    if (!result.ok) return setErrors(result.errors)
    setErrors({})
    onSubmit({ form, profile: result.profile, budget: result.budget })
  }

  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2>Your details</h2>
      <div className="form-grid">
        <Field id="weightKg" label="Weight (kg)" error={errors.weightKg}>
          <input id="weightKg" type="text" inputMode="decimal" autoComplete="off" value={form.weightKg} onChange={set('weightKg')} {...aria('weightKg')} />
        </Field>
        <Field id="heightCm" label="Height (cm)" error={errors.heightCm}>
          <input id="heightCm" type="text" inputMode="decimal" autoComplete="off" value={form.heightCm} onChange={set('heightCm')} {...aria('heightCm')} />
        </Field>
        <Field id="age" label="Age" error={errors.age}>
          <input id="age" type="text" inputMode="numeric" autoComplete="off" value={form.age} onChange={set('age')} {...aria('age')} />
        </Field>
        <Field id="sex" label="Sex" error={errors.sex}>
          <select id="sex" value={form.sex} onChange={set('sex')} {...aria('sex')}>
            <option value="">Choose…</option>
            {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field id="activity" label="Activity level" error={errors.activity} wide>
          <select id="activity" value={form.activity} onChange={set('activity')} {...aria('activity')}>
            <option value="">Choose…</option>
            {ACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field id="goal" label="Goal" error={errors.goal}>
          <select id="goal" value={form.goal} onChange={set('goal')} {...aria('goal')}>
            <option value="">Choose…</option>
            {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field id="budget" label="Weekly budget (AUD)" hint="Lunch and dinner, Monday to Friday" error={errors.budget}>
          <input id="budget" type="text" inputMode="decimal" autoComplete="off" value={form.budget} onChange={set('budget')} {...aria('budget')} />
        </Field>
      </div>
      {hasErrors && <p className="field-error" role="alert">Please fix the highlighted fields.</p>}
      <p className="muted">Your details stay in this browser. Only the numbers above are sent to build the plan.</p>
      <div className="button-row">
        <button type="submit" className="button">Build my plan</button>
        {onCancel && <button type="button" className="button button-secondary" onClick={onCancel}>Back to my plan</button>}
      </div>
    </form>
  )
}
