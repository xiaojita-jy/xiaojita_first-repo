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

  if (loading) return <div className="px-4 py-8 text-center text-gray-400">加载中...</div>;

  return (
    <div className="px-4 py-8">
      <h1 className="text-xl font-bold text-ink mb-6">预算设置</h1>

      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-3">月度总预算</h2>
        <div className="flex gap-2">
          <input
            type="text" inputMode="decimal"
            value={totalBudget}
            onChange={e => setTotalBudget(e.target.value)}
            placeholder="例如：10000"
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-ink focus:outline-none focus:border-blue-400 bg-white"
          />
          <button onClick={handleSaveTotal} className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium">保存</button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-ink mb-3">分类预算</h2>
        <div className="space-y-3">
          {expenseCategories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2">
              <span className="text-lg w-8 text-center">{cat.icon}</span>
              <span className="text-sm text-ink w-16">{cat.name}</span>
              <input
                type="text" inputMode="decimal"
                value={categoryBudgets[cat.id] || ''}
                onChange={e => setCategoryBudgets(prev => ({ ...prev, [cat.id]: e.target.value }))}
                placeholder="限额"
                className="flex-1 px-3 py-2 rounded-lg border border-border text-sm text-ink focus:outline-none focus:border-blue-400 bg-white"
              />
              <button onClick={() => handleSaveCategory(cat.id)} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium">保存</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
