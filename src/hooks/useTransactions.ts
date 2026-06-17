import { useState, useEffect, useCallback } from 'react';
import { DexieAdapter } from '../adapters/dexie';
import { generateId } from '../utils/format';
import type { Transaction, PaymentMethod } from '../models';
import type { IAdapter } from '../adapters/types';

export function useTransactions(month?: string, adapter: IAdapter = DexieAdapter) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const txs = month
      ? await adapter.getTransactionsByMonth(month)
      : await adapter.getAllTransactions();
    setTransactions(txs);
    setLoading(false);
  }, [month, adapter]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (data: {
    type: 'expense' | 'income';
    amount: number;
    categoryId: string;
    subCategoryId?: string;
    paymentMethod: PaymentMethod;
    date: string;
    note?: string;
  }) => {
    const tx: Transaction = {
      id: generateId(),
      ...data,
      createdAt: Date.now(),
    };
    await adapter.addTransaction(tx);
    await load();
    return tx;
  }, [load, adapter]);

  const update = useCallback(async (id: string, data: Partial<Transaction>) => {
    await adapter.updateTransaction(id, data);
    await load();
  }, [load, adapter]);

  const remove = useCallback(async (id: string) => {
    await adapter.deleteTransaction(id);
    await load();
  }, [load, adapter]);

  const totals = useCallback(() => {
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    return { expense, income, balance: income - expense };
  }, [transactions]);

  const byCategory = useCallback(() => {
    const map = new Map<string, number>();
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
      });
    return map;
  }, [transactions]);

  return {
    transactions, loading,
    add, update, remove,
    totals: totals(), byCategory: byCategory(),
    reload: load,
  };
}
