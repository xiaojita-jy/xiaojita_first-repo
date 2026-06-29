interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = '确认删除' }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="rounded-2xl p-6 mx-4 max-w-sm w-full border border-[rgba(71,85,105,0.3)]"
        style={{ background: 'rgba(20, 30, 44, 0.95)', backdropFilter: 'blur(20px)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-slate-400 mt-2">{message}</p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-[rgba(71,85,105,0.35)] text-slate-300 text-sm"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
