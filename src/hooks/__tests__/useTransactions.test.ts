import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { IAdapter } from '../../adapters/types';

function createMockAdapter(overrides: Partial<IAdapter> = {}): IAdapter {
  return {
    getAllTransactions: vi.fn(() => Promise.resolve([])),
    getTransactionsByMonth: vi.fn(() => Promise.resolve([])),
    getTransactionsByCategory: vi.fn(() => Promise.resolve([])),
    addTransaction: vi.fn(() => Promise.resolve()),
    updateTransaction: vi.fn(() => Promise.resolve()),
    deleteTransaction: vi.fn(() => Promise.resolve()),
    getAllCategories: vi.fn(() => Promise.resolve([])),
    getCategoriesByType: vi.fn(() => Promise.resolve([])),
    getSubCategories: vi.fn(() => Promise.resolve([])),
    addCategory: vi.fn(() => Promise.resolve()),
    updateCategory: vi.fn(() => Promise.resolve()),
    deleteCategory: vi.fn(() => Promise.resolve()),
    getTransactionCountByCategory: vi.fn(() => Promise.resolve(0)),
    getBudget: vi.fn(() => Promise.resolve(undefined)),
    getAllBudgets: vi.fn(() => Promise.resolve([])),
    setBudget: vi.fn(() => Promise.resolve()),
    deleteBudget: vi.fn(() => Promise.resolve()),
    deleteBudgetsByCategory: vi.fn(() => Promise.resolve()),
    getSetting: vi.fn(() => Promise.resolve(null)),
    setSetting: vi.fn(() => Promise.resolve()),
    seedDefaultCategories: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

let useTransactions: typeof import('../useTransactions').useTransactions;
beforeAll(async () => {
  const mod = await import('../useTransactions');
  useTransactions = mod.useTransactions;
});

describe('useTransactions', () => {
  let adapter: IAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  it('挂载时加载交易列表', async () => {
    const sampleTx = {
      id: '1',
      type: 'expense' as const,
      amount: 5000,
      categoryId: 'cat_food',
      paymentMethod: 'wechat' as const,
      date: '2024-06-16',
      createdAt: Date.now(),
    };
    (adapter.getAllTransactions as any).mockResolvedValue([sampleTx]);

    const { result } = renderHook(() => useTransactions(undefined, adapter));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(adapter.getAllTransactions).toHaveBeenCalled();
    expect(result.current.transactions).toHaveLength(1);
  });

  it('传入 month 时按月份加载', async () => {
    renderHook(() => useTransactions('2024-06', adapter));

    await waitFor(() => {
      expect(adapter.getTransactionsByMonth).toHaveBeenCalledWith('2024-06');
    });
  });

  it('add 创建交易后重新加载', async () => {
    (adapter.getAllTransactions as any).mockResolvedValue([]);

    const { result } = renderHook(() => useTransactions(undefined, adapter));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.add({
        type: 'expense',
        amount: 2500,
        categoryId: 'cat_1',
        paymentMethod: 'wechat',
        date: '2024-06-16',
      });
    });

    expect(adapter.addTransaction).toHaveBeenCalled();
    const callArg = (adapter.addTransaction as any).mock.calls[0][0];
    expect(callArg.type).toBe('expense');
    expect(callArg.amount).toBe(2500);
    expect(callArg.id).toBeTruthy();
    expect(callArg.createdAt).toBeTruthy();
  });

  it('update 调用 adapter 更新后重新加载', async () => {
    (adapter.getAllTransactions as any).mockResolvedValue([]);

    const { result } = renderHook(() => useTransactions(undefined, adapter));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update('tx_1', { note: 'updated' });
    });

    expect(adapter.updateTransaction).toHaveBeenCalledWith('tx_1', { note: 'updated' });
  });

  it('remove 调用 adapter 删除后重新加载', async () => {
    (adapter.getAllTransactions as any).mockResolvedValue([]);

    const { result } = renderHook(() => useTransactions(undefined, adapter));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove('tx_1');
    });

    expect(adapter.deleteTransaction).toHaveBeenCalledWith('tx_1');
  });

  it('totals 正确计算收支结余', async () => {
    const txs = [
      { id: '1', type: 'expense' as const, amount: 5000, categoryId: 'cat_1', paymentMethod: 'wechat' as const, date: '2024-06-16', createdAt: 1 },
      { id: '2', type: 'expense' as const, amount: 3000, categoryId: 'cat_2', paymentMethod: 'cash' as const, date: '2024-06-16', createdAt: 2 },
      { id: '3', type: 'income' as const, amount: 10000, categoryId: 'cat_income', paymentMethod: 'bank_card' as const, date: '2024-06-16', createdAt: 3 },
    ];
    (adapter.getAllTransactions as any).mockResolvedValue(txs);

    const { result } = renderHook(() => useTransactions(undefined, adapter));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totals).toEqual({
      expense: 8000,
      income: 10000,
      balance: 2000,
    });
  });

  it('byCategory 正确按分类分组支出', async () => {
    const txs = [
      { id: '1', type: 'expense' as const, amount: 5000, categoryId: 'cat_food', paymentMethod: 'wechat' as const, date: '2024-06-16', createdAt: 1 },
      { id: '2', type: 'expense' as const, amount: 3000, categoryId: 'cat_food', paymentMethod: 'cash' as const, date: '2024-06-16', createdAt: 2 },
      { id: '3', type: 'expense' as const, amount: 2000, categoryId: 'cat_transport', paymentMethod: 'wechat' as const, date: '2024-06-16', createdAt: 3 },
      { id: '4', type: 'income' as const, amount: 10000, categoryId: 'cat_salary', paymentMethod: 'bank_card' as const, date: '2024-06-16', createdAt: 4 },
    ];
    (adapter.getAllTransactions as any).mockResolvedValue(txs);

    const { result } = renderHook(() => useTransactions(undefined, adapter));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.byCategory.get('cat_food')).toBe(8000);
    expect(result.current.byCategory.get('cat_transport')).toBe(2000);
    expect(result.current.byCategory.has('cat_salary')).toBe(false);
  });
});
