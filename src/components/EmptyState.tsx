interface Props {
  icon?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = '📭', message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <span className="text-5xl">{icon}</span>
      <p className="mt-3 text-sm">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
