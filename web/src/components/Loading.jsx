export default function Loading({ onCancel }) {
  return (
    <div className="card status-box" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <h2>Building your plan…</h2>
      <p className="muted">The AI is picking meals and the app is checking every calorie and dollar. This can take 20 to 60 seconds.</p>
      <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
    </div>
  )
}
