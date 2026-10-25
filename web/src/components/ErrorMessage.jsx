import { IconAlert } from './Icons.jsx'

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="card status-screen" role="alert">
      <div className="error-head">
        <span className="error-icon" aria-hidden="true"><IconAlert width="1.5em" height="1.5em" /></span>
        <div>
          <h2>That didn't work</h2>
          <p className="muted">Nothing is lost. Your details are still filled in.</p>
        </div>
      </div>
      <div className="notice notice-danger">
        <div className="notice-body"><span className="notice-detail">{message}</span></div>
      </div>
      <p className="muted">This is usually a busy AI service. Wait a minute, then try again.</p>
      <button type="button" className="button button-lg" onClick={onRetry}>Back to the form</button>
    </div>
  )
}
