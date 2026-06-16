import { useState, useEffect, useCallback } from 'react';
import { DexieAdapter } from '../adapters/dexie';
import { generateId, getCurrentMonth } from '../utils/format';
import type { Budget } from '../models';

export function useBudget(month?: string) {
  const currentMonth = month || getCurrentMonth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await DexieAdapter.getAllBudgets(currentMonth);
    setBudgets(all);
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => { load(); }, [load]);

  const getBudget = useCallback(
    (categoryId?: string) => budgets.find(b => b.categoryId === (categoryId ?? '__total__')),
    [budgets]
  );

  const setBudget = useCallback(async (categoryId: string | undefined, amount: number) => {
    const budget: Budget = {
      id: generateId(),
      categoryId,
      month: currentMonth,
      amount,
    };
    await DexieAdapter.setBudget(budget);
    await load();
  }, [currentMonth, load]);

  const removeBudget = useCallback(async (categoryId: string | undefined) => {
    const existing = budgets.find(b => b.categoryId === (categoryId ?? '__total__'));
    if (existing) {
      await DexieAdapter.deleteBudget(existing.id);
      await load();
    }
  }, [budgets, load]);

  const calculateProgress = useCallback(async () => {
    const totalBudget = budgets.find(b => b.categoryId === '__total__' || !b.categoryId);
    if (!totalBudget) return null;

    const txs = await DexieAdapter.getTransactionsByMonth(currentMonth);
    const totalExpense = txs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      budget: totalBudget.amount,
      spent: totalExpense,
      remaining: totalBudget.amount - totalExpense,
      percentage: Math.round((totalExpense / totalBudget.amount) * 100),
    };
  }, [budgets, currentMonth]);

  return { budgets, loading, getBudget, setBudget, removeBudget, calculateProgress, reload: load };
}
