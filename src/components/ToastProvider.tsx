import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ToastType = 'loading' | 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (options: {
    type: ToastType;
    message: string;
    /**
     * Duration in ms before auto-dismiss.
     * Use 0 or omit for persistent toasts (e.g. loading).
     */
    durationMs?: number;
  }) => number;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (options: { type: ToastType; message: string; durationMs?: number }) => {
      const id = Date.now() + Math.random();
      const { type, message, durationMs } = options;
      setToasts((current) => [...current, { id, type, message }]);

      const autoDuration =
        durationMs ?? (type === 'loading' ? 0 : type === 'error' ? 6000 : 3000);

      if (autoDuration > 0) {
        window.setTimeout(() => {
          dismissToast(id);
        }, autoDuration);
      }

      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
          >
            <span className="toast-dot" />
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

