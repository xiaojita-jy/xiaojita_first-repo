export interface ToastMessage {
  id: string;
  type: 'warning' | 'danger';
  message: string;
}

const TOAST_EVENT = 'keep_accounts::toast';

export function showToast(message: string, type: 'warning' | 'danger'): void {
  const detail: ToastMessage = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message,
    type,
  };
  window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, { detail }));
}

export function onToast(callback: (toast: ToastMessage) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent<ToastMessage>).detail);
  window.addEventListener(TOAST_EVENT, handler);
  return () => window.removeEventListener(TOAST_EVENT, handler);
}
