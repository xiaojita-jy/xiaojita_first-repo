import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// vi.mock hoists — must use vi.fn() directly in factory, no external variables
vi.mock('../../adapters/dexie', () => ({
  DexieAdapter: {
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
    getSetting: vi.fn(() => Promise.resolve(null)),
    setSetting: vi.fn(() => Promise.resolve()),
    seedDefaultCategories: vi.fn(() => Promise.resolve()),
  },
  db: {},
}));

import { useTransactions } from '../useTransactions';
// Re-import adapter after mock to get reference
const adapterModule = await import('../../adapters/dexie');
const mockAdapter = adapterModule.DexieAdapter;

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset defaults
    (mockAdapter.getAllTransactions as any).mockResolvedValue([]);
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
    (mockAdapter.getAllTransactions as any).mockResolvedValue([sampleTx]);

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockAdapter.getAllTransactions).toHaveBeenCalled();
    expect(result.current.transactions).toHaveLength(1);
  });

  it('传入 month 时按月份加载', async () => {
    renderHook(() => useTransactions('2024-06'));

    await waitFor(() => {
      expect(mockAdapter.getTransactionsByMonth).toHaveBeenCalledWith('2024-06');
    });
  });

  it('add 创建交易后重新加载', async () => {
    (mockAdapter.getAllTransactions as any).mockResolvedValue([]);

    const { result } = renderHook(() => useTransactions());

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

    expect(mockAdapter.addTransaction).toHaveBeenCalled();
    const callArg = (mockAdapter.addTransaction as any).mock.calls[0][0];
    expect(callArg.type).toBe('expense');
    expect(callArg.amount).toBe(2500);
    expect(callArg.id).toBeTruthy();
    expect(callArg.createdAt).toBeTruthy();
  });

  it('update 调用 adapter 更新后重新加载', async () => {
    (mockAdapter.getAllTransactions as any).mockResolvedValue([]);

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update('tx_1', { note: 'updated' });
    });

    expect(mockAdapter.updateTransaction).toHaveBeenCalledWith('tx_1', { note: 'updated' });
  });

  it('remove 调用 adapter 删除后重新加载', async () => {
    (mockAdapter.getAllTransactions as any).mockResolvedValue([]);

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove('tx_1');
    });

    expect(mockAdapter.deleteTransaction).toHaveBeenCalledWith('tx_1');
  });

  it('totals 正确计算收支结余', async () => {
    const txs = [
      { id: '1', type: 'expense' as const, amount: 5000, categoryId: 'cat_1', paymentMethod: 'wechat' as const, date: '2024-06-16', createdAt: 1 },
      { id: '2', type: 'expense' as const, amount: 3000, categoryId: 'cat_2', paymentMethod: 'cash' as const, date: '2024-06-16', createdAt: 2 },
      { id: '3', type: 'income' as const, amount: 10000, categoryId: 'cat_income', paymentMethod: 'bank_card' as const, date: '2024-06-16', createdAt: 3 },
    ];
    (mockAdapter.getAllTransactions as any).mockResolvedValue(txs);

    const { result } = renderHook(() => useTransactions());

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
    (mockAdapter.getAllTransactions as any).mockResolvedValue(txs);

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.byCategory.get('cat_food')).toBe(8000);
    expect(result.current.byCategory.get('cat_transport')).toBe(2000);
    expect(result.current.byCategory.has('cat_salary')).toBe(false);
  });
});
