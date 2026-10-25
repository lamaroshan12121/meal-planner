import { useEffect, useState } from 'react'
import { IconCheck } from './Icons.jsx'

// What usually happens while the AI works. The browser cannot see the server's progress, so these move on by time.
const STEPS = [
  { at: 0, text: 'Sending your targets and budget' },
  { at: 3, text: 'Designing one lunch and one dinner' },
  { at: 10, text: 'Checking calories and pricing the shop' },
  { at: 20, text: 'Fine-tuning, for example swapping in cheaper ingredients' },
]

export default function Loading({ onCancel }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  const current = STEPS.reduce((acc, step, i) => (seconds >= step.at ? i : acc), 0)

  return (
    <div className="card status-screen" aria-busy="true">
      <div className="loader-head">
        <div className="loader-ring" aria-hidden="true" />
        <div>
          <h2>Building your week…</h2>
          <p className="muted">Usually 10 to 30 seconds. <span className="loader-time" aria-hidden="true">{seconds}s</span></p>
        </div>
      </div>
      <div className="progress-track" aria-hidden="true" />
      <p className="sr-only" role="status" aria-live="polite">{STEPS[current].text}</p>
      <ol className="loading-steps" aria-hidden="true">
        {STEPS.map((step, i) => (
          <li key={step.text} className={`loading-step${i < current ? ' is-done' : ''}${i === current ? ' is-current' : ''}`}>
            <span className="loading-step-dot">{i < current && <IconCheck width="0.9em" height="0.9em" />}</span>
            {step.text}
          </li>
        ))}
      </ol>
      <div className="skeleton-stack" aria-hidden="true">
        <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
      </div>
      <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
    </div>
  )
}
