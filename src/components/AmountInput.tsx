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
        className="text-4xl font-bold text-gray-800 flex items-center justify-center"
        onClick={() => inputRef.current?.focus()}
      >
        <span className="text-2xl mr-1">¥</span>
        <span className={value ? '' : 'text-gray-300'}>
          {value || '0.00'}
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
      <p className="text-xs text-gray-400 mt-2">点击金额输入</p>
    </div>
  );
}
