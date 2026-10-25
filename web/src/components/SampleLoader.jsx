import { useState } from 'react'
import { SAMPLE_VARIANTS } from '../lib/sample.js'

// For designing the screens: shows a plan built from the test fixtures. No API call, no Gemini quota, nothing saved.
export default function SampleLoader({ onLoad }) {
  const [key, setKey] = useState(SAMPLE_VARIANTS[0].key)
  return (
    <details className="card">
      <summary>Sample plans (no AI call)</summary>
      <div className="sample-tools">
        <label htmlFor="sample-variant" className="muted">Pick a sample, then load it. Nothing is saved.</label>
        <select id="sample-variant" value={key} onChange={(e) => setKey(e.target.value)}>
          {SAMPLE_VARIANTS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
        </select>
        <div className="button-row">
          <button type="button" className="button button-secondary" onClick={() => onLoad(key)}>Load sample plan</button>
        </div>
      </div>
    </details>
  )
}
