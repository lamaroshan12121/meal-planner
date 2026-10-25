import { useMemo, useRef, useState } from 'react'
import ProfileForm from './components/ProfileForm.jsx'
import Loading from './components/Loading.jsx'
import ErrorMessage from './components/ErrorMessage.jsx'
import Results from './components/Results.jsx'
import SampleLoader from './components/SampleLoader.jsx'
import Notice from './components/Notice.jsx'
import { EMPTY_FORM } from './lib/profile.js'
import { loadForm, saveForm, loadPlanRecord, savePlanRecord } from './lib/storage.js'
import { requestPlan } from './lib/api.js'
import { buildResult } from './lib/results.js'
import { buildSample } from './lib/sample.js'

export default function App() {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(loadForm() || {}) })) // last profile, from localStorage
  const [saved, setSaved] = useState(() => loadPlanRecord())                          // last plan, from localStorage
  const [sample, setSample] = useState(null)                                         // a sample plan being previewed (never saved)
  const [status, setStatus] = useState('idle')                                       // 'idle' | 'loading' | 'error'
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const abortRef = useRef(null)

  // Everything shown is recalculated by code from the saved meal choices, so it always matches the current price list.
  const record = sample || saved
  const result = useMemo(() => buildResult(record), [record])
  const showForm = formOpen || !result

  async function generate({ form: submitted, profile, budget }) {
    setForm(submitted)
    saveForm(submitted)
    setSample(null)
    setError('')
    setStatus('loading')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const data = await requestPlan({ profile, budget, signal: controller.signal })
      const next = { savedAt: new Date().toISOString(), source: 'ai', form: submitted, profile, budget, recipes: data.recipes, attempts: data.attempts }
      if (!buildResult(next)) throw new Error('The planner sent back a plan the app could not read. Please try again.')
      savePlanRecord(next)
      setSaved(next)
      setFormOpen(false)
      setStatus('idle')
    } catch (err) {
      if (err?.name === 'AbortError') return setStatus('idle')
      setError(err.message)
      setFormOpen(true)
      setStatus('error')
    }
  }

  const cancel = () => abortRef.current?.abort()
  const newPlan = () => { setSample(null); setFormOpen(true) }
  const loadSample = (key) => { setSample(buildSample(key)); setFormOpen(false) }

  let screen
  if (status === 'loading') {
    screen = <Loading onCancel={cancel} />
  } else if (status === 'error') {
    screen = <ErrorMessage message={error} onRetry={() => setStatus('idle')} />
  } else if (showForm) {
    screen = (
      <>
        <header className="page-header">
          <h1>Meal Prep Planner</h1>
          <p className="muted">A week of lunches and dinners that fits your calories and your budget.</p>
        </header>
        <ProfileForm initialForm={form} onSubmit={generate} onCancel={result ? () => setFormOpen(false) : undefined} />
        <SampleLoader onLoad={loadSample} />
        <Notice />
      </>
    )
  } else {
    screen = <Results record={record} result={result} onNewPlan={newPlan} onCloseSample={() => setSample(null)} />
  }

  return <main className="page">{screen}</main>
}
