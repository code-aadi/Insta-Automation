import { X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

/**
 * ToastContainer
 * ---------------------------------------------------------------------------
 * Displays temporary status notifications in the bottom-right corner.
 */
export default function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item toast-item--${toast.type}`}>
          <span>{toast.title}</span>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(toast.id)}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
