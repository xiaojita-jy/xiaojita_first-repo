interface Props {
  icon?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = '📭', message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <span className="text-5xl">{icon}</span>
      <p className="mt-3 text-sm text-slate-400">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{
            background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
            boxShadow: '0 4px 16px rgba(2, 132, 199, 0.2)',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
