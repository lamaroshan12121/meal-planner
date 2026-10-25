import { useState } from 'react'
import { SAMPLE_VARIANTS } from '../lib/sample.js'

// Shows a plan built from the test fixtures. No API call, no Gemini quota, nothing saved.
export default function SampleLoader({ onLoad }) {
  const [key, setKey] = useState(SAMPLE_VARIANTS[0].key)
  return (
    <section className="sample-box" aria-labelledby="sample-title">
      <h2 id="sample-title" className="sample-title">Just looking?</h2>
      <p className="muted">See a full example week first. It uses test data: no AI call, and nothing is saved.</p>
      <div className="sample-controls">
        <label htmlFor="sample-variant" className="sr-only">Sample type</label>
        <select id="sample-variant" className="input" value={key} onChange={(e) => setKey(e.target.value)}>
          {SAMPLE_VARIANTS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
        </select>
        <button type="button" className="button button-secondary" onClick={() => onLoad(key)}>Load sample plan</button>
      </div>
    </section>
  )
}
