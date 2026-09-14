import './StateMessages.css';

export interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="state-panel error-panel" role="alert">
      <span className="state-panel-icon" aria-hidden="true">
        ⚠️
      </span>
      <h2>Something went wrong</h2>
      <p>{message}</p>
    </div>
  );
}
