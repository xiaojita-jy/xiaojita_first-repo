import { useState, useEffect, useCallback } from 'react';
import { DexieAdapter } from '../adapters/dexie';
import { getPastMonths } from '../utils/format';
import type { Transaction } from '../models';
import type { IAdapter } from '../adapters/types';

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  icon: string;
  amount: number;
  percentage: number;
  subCategories?: CategorySummary[];
}

export interface MonthlySummary {
  month: string;
  expense: number;
  income: number;
}

export interface Anomaly {
  categoryId: string;
  categoryName: string;
  icon: string;
  currentAmount: number;
  avgAmount: number;
  deviation: number;
}

export function useReports(adapter: IAdapter = DexieAdapter) {
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);

  const loadMonthlySummaries = useCallback(async () => {
    const months = getPastMonths(6);
    const summaries: MonthlySummary[] = [];
    for (const month of months) {
      const txs = await adapter.getTransactionsByMonth(month);
      summaries.push({
        month,
        expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      });
    }
    setMonthlySummaries(summaries);
  }, [adapter]);

  useEffect(() => { loadMonthlySummaries(); }, [loadMonthlySummaries]);

  const getCategoryBreakdown = useCallback(async (month: string): Promise<CategorySummary[]> => {
    const txs = await adapter.getTransactionsByMonth(month);
    const expenseTxs = txs.filter(t => t.type === 'expense');
    const totalExpense = expenseTxs.reduce((s, t) => s + t.amount, 0);
    if (totalExpense === 0) return [];

    const cats = await adapter.getAllCategories();
    const parentCats = cats.filter(c => !c.parentId && c.type === 'expense');

    const byParent = new Map<string, Transaction[]>();
    expenseTxs.forEach(t => {
      const cat = cats.find(c => c.id === t.categoryId);
      const parentId = cat?.parentId || t.categoryId;
      if (!byParent.has(parentId)) byParent.set(parentId, []);
      byParent.get(parentId)!.push(t);
    });

    return parentCats.map(cat => {
      const txs = byParent.get(cat.id) || [];
      const amount = txs.reduce((s, t) => s + t.amount, 0);
      const subs = cats.filter(sc => sc.parentId === cat.id);
      const subSummaries: CategorySummary[] = subs.map(sub => {
        const subTxs = txs.filter(t => t.categoryId === sub.id);
        const subAmount = subTxs.reduce((s, t) => s + t.amount, 0);
        return {
          categoryId: sub.id,
          categoryName: sub.name,
          icon: sub.icon,
          amount: subAmount,
          percentage: totalExpense > 0 ? Math.round((subAmount / totalExpense) * 100) : 0,
        };
      }).filter(s => s.amount > 0);

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        icon: cat.icon,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
        subCategories: subSummaries.length > 0 ? subSummaries : undefined,
      };
    }).filter(s => s.amount > 0);
  }, [adapter]);

  const getSubCategoryTransactions = useCallback(async (categoryId: string, month: string): Promise<Transaction[]> => {
    const txs = await adapter.getTransactionsByCategory(categoryId, month);
    return txs.filter(t => t.type === 'expense').sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [adapter]);

  const getAnomalies = useCallback(async (month: string): Promise<Anomaly[]> => {
    const [y, m] = month.split('-').map(Number);
    const past3Months: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(y, m - 1 - i, 1);
      past3Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const cats = await adapter.getCategoriesByType('expense');
    const parentCats = cats.filter(c => !c.parentId);
    const anomalies: Anomaly[] = [];

    for (const cat of parentCats) {
      const currentTxs = await adapter.getTransactionsByCategory(cat.id, month);
      const currentAmount = currentTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      let totalPast = 0;
      let monthCount = 0;
      for (const pm of past3Months) {
        const pastTxs = await adapter.getTransactionsByCategory(cat.id, pm);
        const pastAmount = pastTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        totalPast += pastAmount;
        monthCount++;
      }
      const avgAmount = monthCount > 0 ? Math.round(totalPast / monthCount) : 0;

      if (avgAmount > 0) {
        const deviation = Math.round(((currentAmount - avgAmount) / avgAmount) * 100);
        if (deviation > 50) {
          anomalies.push({ categoryId: cat.id, categoryName: cat.name, icon: cat.icon, currentAmount, avgAmount, deviation });
        }
      }
    }

    return anomalies.sort((a, b) => b.deviation - a.deviation);
  }, [adapter]);

  return { monthlySummaries, getCategoryBreakdown, getSubCategoryTransactions, getAnomalies, reload: loadMonthlySummaries };
}
