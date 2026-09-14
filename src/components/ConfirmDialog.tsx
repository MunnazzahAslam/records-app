import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({ isOpen, message, onConfirm, onCancel }: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Reset on mount (not just declare via useRef's initial value) because
    // StrictMode double-invokes effects in development — mount, cleanup,
    // mount again — which would otherwise leave this stuck at `false` after
    // the simulated cleanup, even though the component is genuinely mounted.
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleConfirm() {
    setIsConfirming(true);
    await onConfirm();
    if (isMountedRef.current) {
      setIsConfirming(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="confirm-dialog">
        <h2 className="confirm-dialog-title">Confirm Delete</h2>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-cancel" onClick={onCancel} disabled={isConfirming}>
            Cancel
          </button>
          <button type="button" className="confirm-dialog-confirm" onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming && <span className="button-spinner" aria-hidden="true" />}
            {isConfirming ? 'Deleting…' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
