import { PAYMENT_METHODS, type PaymentMethod } from '../models';

interface Props {
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
}

export default function PaymentPicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2">支付方式</label>
      <div className="flex flex-wrap gap-2">
        {PAYMENT_METHODS.map(pm => (
          <button
            key={pm.value}
            type="button"
            onClick={() => onChange(pm.value)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              value === pm.value
                ? 'bg-accent text-white border-accent'
                : 'bg-[rgba(30,41,59,0.35)] text-slate-400 border-[rgba(71,85,105,0.35)]'
            }`}
          >
            {pm.label}
          </button>
        ))}
      </div>
    </div>
  );
}
