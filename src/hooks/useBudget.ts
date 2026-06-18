import { useState, useEffect, useCallback } from 'react';
import { DexieAdapter } from '../adapters/dexie';
import { generateId, getCurrentMonth } from '../utils/format';
import type { Budget, Category, BudgetAlert } from '../models';
import type { IAdapter } from '../adapters/types';

export interface BudgetCategoryRate {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  color?: string;
  budget: number;
  spent: number;
  rate: number;
}

export interface BudgetHistoryItem {
  month: string;
  totalBudget: number;
  totalSpent: number;
  totalRate: number;
  categories: BudgetCategoryRate[];
}

export function useBudget(month?: string, adapter: IAdapter = DexieAdapter) {
  const currentMonth = month || getCurrentMonth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await adapter.getAllBudgets(currentMonth);
    // 过滤掉分类已被删除的孤儿预算
    const categories = await adapter.getAllCategories();
    const validBudgets = all.filter(b => {
      // 总预算（没有 categoryId 或 __total__）保留
      if (!b.categoryId || b.categoryId === '__total__') return true;
      // 分类预算：检查分类是否存在
      return categories.some(c => c.id === b.categoryId);
    });
    setBudgets(validBudgets);
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

  const getBudgetHistory = useCallback(async (startMonth: string, endMonth: string) => {
    const allBudgets = await adapter.getBudgetsInRange(startMonth, endMonth);
    const categories = await adapter.getAllCategories();

    // 按月份分组
    const byMonth = new Map<string, Budget[]>();
    for (const b of allBudgets) {
      if (!byMonth.has(b.month)) byMonth.set(b.month, []);
      byMonth.get(b.month)!.push(b);
    }

    const result: BudgetHistoryItem[] = [];

    for (const [month, monthBudgets] of byMonth) {
      const txs = await adapter.getTransactionsByMonth(month);
      const expenseTxs = txs.filter(t => t.type === 'expense');
      const totalSpent = expenseTxs.reduce((s, t) => s + t.amount, 0);

      const totalBudget = monthBudgets.find(b => !b.categoryId || b.categoryId === '__total__');

      const categoryRates: BudgetCategoryRate[] = [];

      for (const b of monthBudgets) {
        if (!b.categoryId || b.categoryId === '__total__') continue;

        const cat = categories.find(c => c.id === b.categoryId);
        if (!cat) continue;

        // 计算该分类及其子分类的支出
        const spent = expenseTxs
          .filter(t => {
            if (t.categoryId === b.categoryId) return true;
            const txCat = categories.find(c => c.id === t.categoryId);
            return txCat?.parentId === b.categoryId;
          })
          .reduce((s, t) => s + t.amount, 0);

        categoryRates.push({
          categoryId: b.categoryId,
          categoryName: cat.name,
          categoryIcon: cat.icon,
          color: cat.color,
          budget: b.amount,
          spent,
          rate: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
        });
      }

      result.push({
        month,
        totalBudget: totalBudget?.amount ?? 0,
        totalSpent,
        totalRate: totalBudget && totalBudget.amount > 0
          ? Math.round((totalSpent / totalBudget.amount) * 100)
          : 0,
        categories: categoryRates,
      });
    }

    return result.sort((a, b) => a.month.localeCompare(b.month));
  }, [adapter]);

  return { budgets, loading, getBudget, setBudget, removeBudget, calculateProgress, checkAlerts, getBudgetHistory, reload: load };
}
