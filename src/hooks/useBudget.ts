import { useState, useEffect, useCallback } from 'react';
import { DexieAdapter } from '../adapters/dexie';
import { generateId, getCurrentMonth } from '../utils/format';
import type { Budget, Category, BudgetAlert } from '../models';
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
    (categoryId?: string) => budgets.find(b => {
      const targetId = categoryId ?? '__total__';
      return b.categoryId === targetId || (targetId === '__total__' && !b.categoryId);
    }),
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

  const checkAlerts = useCallback(async (categories: Category[]): Promise<BudgetAlert[]> => {
    const txs = await adapter.getTransactionsByMonth(currentMonth);
    const alerts: BudgetAlert[] = [];

    for (const budget of budgets) {
      if (budget.amount <= 0) continue;

      const isTotal = !budget.categoryId || budget.categoryId === '__total__';
      let catName = '月度总预算';
      let catIcon = '💰';
      let spent = 0;

      if (isTotal) {
        spent = txs
          .filter(t => t.type === 'expense')
          .reduce((s, t) => s + t.amount, 0);
      } else {
        const cat = categories.find(c => c.id === budget.categoryId);
        if (!cat) continue;
        catName = cat.name;
        catIcon = cat.icon;

        spent = txs
          .filter(t => t.type === 'expense')
          .filter(t => {
            if (t.categoryId === budget.categoryId) return true;
            const txCat = categories.find(c => c.id === t.categoryId);
            return txCat?.parentId === budget.categoryId;
          })
          .reduce((s, t) => s + t.amount, 0);
      }

      const percentage = Math.round((spent / budget.amount) * 100);
      const remaining = budget.amount - spent;

      if (percentage >= 100) {
        alerts.push({
          categoryId: isTotal ? undefined : budget.categoryId,
          categoryName: catName,
          categoryIcon: catIcon,
          level: 'danger',
          budget: budget.amount,
          spent,
          remaining,
          percentage,
        });
      } else if (percentage >= 80) {
        alerts.push({
          categoryId: isTotal ? undefined : budget.categoryId,
          categoryName: catName,
          categoryIcon: catIcon,
          level: 'warning',
          budget: budget.amount,
          spent,
          remaining,
          percentage,
        });
      }
    }

    return alerts;
  }, [budgets, currentMonth, adapter]);

  return { budgets, loading, getBudget, setBudget, removeBudget, calculateProgress, checkAlerts, reload: load };
}
