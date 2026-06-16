import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AmountInput from '../components/AmountInput';
import CategoryPicker from '../components/CategoryPicker';
import PaymentPicker from '../components/PaymentPicker';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { parseAmountToCents, getToday } from '../utils/format';
import type { PaymentMethod } from '../models';

export default function AddRecord() {
  const navigate = useNavigate();
  const { expenseCategories, incomeCategories, getSubs } = useCategories();
  const { add } = useTransactions();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wechat');
  const [date, setDate] = useState(getToday());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = type === 'expense' ? expenseCategories : incomeCategories;
  const subCategories = useMemo(
    () => (categoryId ? getSubs(categoryId) : []),
    [categoryId, getSubs]
  );

  const handleSave = async () => {
    setError('');
    const amount = parseAmountToCents(amountStr);
    if (amount <= 0) {
      setError('请输入金额');
      return;
    }
    if (!categoryId) {
      setError('请选择分类');
      return;
    }
    if (amount > 99_999_99) {
      setError('金额过大，请核实');
      return;
    }

    setSaving(true);
    try {
      await add({
        type,
        amount,
        categoryId: subCategoryId || categoryId,
        subCategoryId: subCategoryId || undefined,
        paymentMethod,
        date,
        note: note || undefined,
      });
      setAmountStr('');
      setCategoryId('');
      setSubCategoryId(undefined);
      setNote('');
      setError('');
      setTimeout(() => navigate('/records'), 300);
    } catch {
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const canSave = amountStr && categoryId && !saving;

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">记一笔</h1>

      <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
        {(['expense', 'income'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setType(t); setCategoryId(''); setSubCategoryId(undefined); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              type === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t === 'expense' ? '💰 支出' : '💵 收入'}
          </button>
        ))}
      </div>

      <AmountInput value={amountStr} onChange={setAmountStr} />

      <div className="space-y-5 mt-6">
        <CategoryPicker
          type={type}
          categories={categories}
          subCategories={subCategories}
          selectedCategoryId={categoryId}
          selectedSubCategoryId={subCategoryId}
          onCategoryChange={id => { setCategoryId(id); setSubCategoryId(undefined); }}
          onSubCategoryChange={setSubCategoryId}
        />

        <div>
          <label className="block text-sm text-gray-500 mb-2">日期</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        <PaymentPicker value={paymentMethod} onChange={setPaymentMethod} />

        <div>
          <label className="block text-sm text-gray-500 mb-2">备注（选填）</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="例如：和同事AA午餐"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

      <button
        onClick={handleSave}
        disabled={!canSave}
        className={`w-full mt-6 py-3 rounded-xl text-white font-medium transition-colors ${
          canSave ? 'bg-blue-500 active:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        {saving ? '保存中...' : '✔️ 保存记账'}
      </button>
    </div>
  );
}
