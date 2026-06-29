import { useEffect, useState, useCallback } from 'react';
import type { ToastMessage } from '../utils/toast';
import { onToast } from '../utils/toast';

export default function ToastContainer() {
  const [toasts, setToasts] = useState<(ToastMessage & { exiting?: boolean })[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  }, []);

  useEffect(() => {
    return onToast((toast) => {
      setToasts(prev => [{ ...toast, exiting: false }, ...prev]);
      setTimeout(() => dismiss(toast.id), 3000);
    });
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto cursor-pointer border ${
            toast.type === 'danger'
              ? 'bg-red-500/90 text-white border-red-400/30'
              : 'bg-amber-500/90 text-white border-amber-400/30'
          } ${toast.exiting ? 'animate-slide-out' : 'animate-slide-in'}`}
          style={{ backdropFilter: 'blur(8px)' }}
          onClick={() => dismiss(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
