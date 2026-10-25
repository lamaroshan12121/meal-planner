export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="card status-box" role="alert">
      <h2>Could not build the plan</h2>
      <div className="banner banner-danger">{message}</div>
      <button type="button" className="button" onClick={onRetry}>Back to the form</button>
    </div>
  )
}
