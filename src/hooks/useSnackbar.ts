import { useCallback, useEffect, useRef, useState } from 'react';

export type SnackbarType = 'success' | 'error';

export interface SnackbarState {
  key: number;
  message: string;
  type: SnackbarType;
}

export interface UseSnackbarResult {
  snackbar: SnackbarState | null;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  dismiss: () => void;
}

const AUTO_DISMISS_MS = 3000;

export function useSnackbar(): UseSnackbarResult {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const nextKeyRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const show = useCallback((message: string, type: SnackbarType) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    nextKeyRef.current += 1;
    setSnackbar({ key: nextKeyRef.current, message, type });

    timeoutRef.current = window.setTimeout(() => {
      setSnackbar(null);
    }, AUTO_DISMISS_MS);
  }, []);

  const showSuccess = useCallback((message: string) => show(message, 'success'), [show]);
  const showError = useCallback((message: string) => show(message, 'error'), [show]);

  const dismiss = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setSnackbar(null);
  }, []);

  return { snackbar, showSuccess, showError, dismiss };
}
