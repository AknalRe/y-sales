import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, WifiOff, X } from 'lucide-react';

export type AppToastTone = 'success' | 'error' | 'warning' | 'info';

type AppToastInput = {
  title: string;
  message?: string;
  tone?: AppToastTone;
  duration?: number;
};

type AppToastItem = Required<Omit<AppToastInput, 'duration'>> & {
  id: string;
  duration: number;
};

const listeners = new Set<(toast: AppToastItem) => void>();

export function showAppToast(input: AppToastInput) {
  if (typeof window === 'undefined') return;

  const toast: AppToastItem = {
    id: crypto.randomUUID(),
    title: input.title,
    message: input.message ?? '',
    tone: input.tone ?? 'info',
    duration: input.duration ?? 4500,
  };

  listeners.forEach((listener) => listener(toast));
}

export function AppToastHost() {
  const [toasts, setToasts] = useState<AppToastItem[]>([]);

  useEffect(() => {
    const listener = (toast: AppToastItem) => {
      setToasts((current) => [toast, ...current].slice(0, 4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, toast.duration);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="app-toast-viewport" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => {
        const Icon = toast.tone === 'success'
          ? CheckCircle2
          : toast.tone === 'error'
            ? AlertCircle
            : toast.tone === 'warning'
              ? WifiOff
              : Info;

        return (
          <div key={toast.id} className={`app-toast app-toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
            <Icon className="app-toast-icon" size={18} aria-hidden="true" />
            <div className="app-toast-body">
              <strong>{toast.title}</strong>
              {toast.message && <span>{toast.message}</span>}
            </div>
            <button
              type="button"
              className="app-toast-close"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              aria-label="Tutup notifikasi"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
