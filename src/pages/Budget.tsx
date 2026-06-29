import { useEffect, useState } from 'react';
import { useBudget } from '../hooks/useBudget';
import { useCategories } from '../hooks/useCategories';
import { parseAmountToCents } from '../utils/format';

export default function Budget() {
  const { budgets, loading, setBudget: saveBudget } = useBudget();
  const { expenseCategories } = useCategories();

  const [totalBudget, setTotalBudget] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading) {
      const total = budgets.find(b => b.categoryId === '__total__' || !b.categoryId);
      if (total) setTotalBudget((total.amount / 100).toString());

      const map: Record<string, string> = {};
      budgets.forEach(b => {
        if (b.categoryId && b.categoryId !== '__total__') {
          map[b.categoryId] = (b.amount / 100).toString();
        }
      });
      setCategoryBudgets(map);
    }
  }, [budgets, loading]);

  const handleSaveTotal = async () => {
    const amount = parseAmountToCents(totalBudget);
    if (amount <= 0) return;
    await saveBudget(undefined, amount);
  };

  const handleSaveCategory = async (categoryId: string) => {
    const val = categoryBudgets[categoryId] || '';
    const amount = parseAmountToCents(val);
    if (amount <= 0) return;
    await saveBudget(categoryId, amount);
  };

  if (loading) return <div className="px-5 pt-7 pb-8 text-center text-slate-500">加载中...</div>;

  return (
    <div className="px-5 pt-7 pb-8">
      <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-6">预算设置</h1>

      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">月度总预算</h2>
        <div className="flex gap-2">
          <input
            type="text" inputMode="decimal"
            value={totalBudget}
            onChange={e => setTotalBudget(e.target.value)}
            placeholder="例如：10000"
            className="input-dark flex-1"
          />
          <button onClick={handleSaveTotal} style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }} className="px-4 py-2.5 text-white rounded-xl text-sm font-medium">保存</button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">分类预算</h2>
        <div className="space-y-3">
          {expenseCategories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2">
              <span className="text-lg w-8 text-center">{cat.icon}</span>
              <span className="text-sm text-slate-200 w-16">{cat.name}</span>
              <input
                type="text" inputMode="decimal"
                value={categoryBudgets[cat.id] || ''}
                onChange={e => setCategoryBudgets(prev => ({ ...prev, [cat.id]: e.target.value }))}
                placeholder="限额"
                className="input-dark flex-1"
              />
              <button onClick={() => handleSaveCategory(cat.id)} style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }} className="px-3 py-2 text-white rounded-lg text-xs font-medium">保存</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
