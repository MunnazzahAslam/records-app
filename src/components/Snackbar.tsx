import { createPortal } from 'react-dom';
import type { SnackbarType } from '../hooks/useSnackbar';
import './Snackbar.css';

export interface SnackbarProps {
  message: string;
  type: SnackbarType;
  onClose: () => void;
}

export function Snackbar({ message, type, onClose }: SnackbarProps) {
  return createPortal(
    <div className={`snackbar snackbar-${type}`} role="status" aria-live="polite">
      <span className="snackbar-message">{message}</span>
      <button type="button" className="snackbar-close" onClick={onClose} aria-label="Dismiss notification">
        ✕
      </button>
    </div>,
    document.body
  );
}
