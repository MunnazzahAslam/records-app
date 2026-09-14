import './StateMessages.css';

export interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({
  title = 'No records found',
  message = 'There are no employee records to display yet.'
}: EmptyStateProps) {
  return (
    <div className="state-panel" role="status">
      <span className="state-panel-icon" aria-hidden="true">
        🗂️
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}
