import { useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function AmountInput({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="py-6 text-center">
      <div
        className="text-5xl font-bold text-text-primary tabular-nums flex items-center justify-center tracking-tight"
        onClick={() => inputRef.current?.focus()}
      >
        <span className={value ? '' : 'text-slate-600'}>
          {value || '0'}
        </span>
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className="opacity-0 absolute"
        value={value}
        onChange={e => {
          const v = e.target.value;
          if (/^\d*\.?\d{0,2}$/.test(v) || v === '') {
            onChange(v);
          }
        }}
        autoFocus
      />
      <p className="text-xs text-slate-500 mt-2">点击金额输入</p>
    </div>
  );
}
