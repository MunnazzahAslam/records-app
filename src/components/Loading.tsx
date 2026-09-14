import './StateMessages.css';
import './Loading.css';

export function Loading() {
  return (
    <div className="state-panel loading-panel" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <p>Loading…</p>
    </div>
  );
}
