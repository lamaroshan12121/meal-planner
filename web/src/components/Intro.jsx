// The top of the form screen. First run: what the app does in three steps. Later: a short "new plan" header.
export default function Intro({ firstRun }) {
  if (!firstRun) {
    return (
      <header className="intro">
        <p className="eyebrow">New plan</p>
        <h1>Plan a new week</h1>
        <p className="intro-lead">Change anything you like. Your current plan stays until the new one is ready.</p>
      </header>
    )
  }
  return (
    <header className="intro">
      <p className="eyebrow">Meal prep, sorted</p>
      <h1 className="intro-title">A week of lunches and dinners. <span className="highlight">Cooked once.</span></h1>
      <p className="intro-lead">Tell us your body, goal and budget. You get two recipes, the calories and protein, and a priced shopping list.</p>
      <ol className="steps">
        <li className="step">
          <span className="step-num" aria-hidden="true">1</span>
          <span className="step-text"><strong>Fill in your details</strong><span className="muted">About 30 seconds.</span></span>
        </li>
        <li className="step">
          <span className="step-num" aria-hidden="true">2</span>
          <span className="step-text"><strong>Get two recipes</strong><span className="muted">One lunch and one dinner, five servings each.</span></span>
        </li>
        <li className="step">
          <span className="step-num" aria-hidden="true">3</span>
          <span className="step-text"><strong>Shop and cook once</strong><span className="muted">Tick things off in the store, then batch cook.</span></span>
        </li>
      </ol>
    </header>
  )
}
