import { useState, useEffect, useCallback } from 'react';
import { DexieAdapter } from '../adapters/dexie';
import { generateId, getCurrentMonth } from '../utils/format';
import type { Budget } from '../models';
import type { IAdapter } from '../adapters/types';

export function useBudget(month?: string, adapter: IAdapter = DexieAdapter) {
  const currentMonth = month || getCurrentMonth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await adapter.getAllBudgets(currentMonth);
    setBudgets(all);
    setLoading(false);
  }, [currentMonth, adapter]);

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
    await adapter.setBudget(budget);
    await load();
  }, [currentMonth, load, adapter]);

  const removeBudget = useCallback(async (categoryId: string | undefined) => {
    const existing = budgets.find(b => b.categoryId === (categoryId ?? '__total__'));
    if (existing) {
      await adapter.deleteBudget(existing.id);
      await load();
    }
  }, [budgets, load, adapter]);

  const calculateProgress = useCallback(async () => {
    const totalBudget = budgets.find(b => b.categoryId === '__total__' || !b.categoryId);
    if (!totalBudget) return null;

    const txs = await adapter.getTransactionsByMonth(currentMonth);
    const totalExpense = txs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      budget: totalBudget.amount,
      spent: totalExpense,
      remaining: totalBudget.amount - totalExpense,
      percentage: Math.round((totalExpense / totalBudget.amount) * 100),
    };
  }, [budgets, currentMonth, adapter]);

  return { budgets, loading, getBudget, setBudget, removeBudget, calculateProgress, reload: load };
}
