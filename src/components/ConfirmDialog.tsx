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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl p-6 mx-4 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500 mt-2">{message}</p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
