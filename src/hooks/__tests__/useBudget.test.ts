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
    getSetting: vi.fn(() => Promise.resolve(null)),
    setSetting: vi.fn(() => Promise.resolve()),
    seedDefaultCategories: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

let useBudget: typeof import('../useBudget').useBudget;
beforeAll(async () => {
  const mod = await import('../useBudget');
  useBudget = mod.useBudget;
});

describe('useBudget', () => {
  let adapter: IAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  it('挂载时加载预算列表', async () => {
    const sampleBudget = {
      id: 'b1',
      categoryId: '__total__',
      month: '2026-06',
      amount: 500000,
    };
    (adapter.getAllBudgets as any).mockResolvedValue([sampleBudget]);

    const { result } = renderHook(() => useBudget('2026-06', adapter));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(adapter.getAllBudgets).toHaveBeenCalledWith('2026-06');
    expect(result.current.budgets).toHaveLength(1);
    expect(result.current.budgets[0].amount).toBe(500000);
  });

  it('不传 month 时使用当前月份', async () => {
    (adapter.getAllBudgets as any).mockResolvedValue([]);

    renderHook(() => useBudget(undefined, adapter));

    await waitFor(() => {
      expect(adapter.getAllBudgets).toHaveBeenCalled();
    });
  });

  it('getBudget 根据 categoryId 查找预算', async () => {
    const budgets = [
      { id: 'b1', categoryId: '__total__', month: '2026-06', amount: 500000 },
      { id: 'b2', categoryId: 'cat_food', month: '2026-06', amount: 200000 },
    ];
    (adapter.getAllBudgets as any).mockResolvedValue(budgets);

    const { result } = renderHook(() => useBudget('2026-06', adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getBudget('cat_food')?.amount).toBe(200000);
    expect(result.current.getBudget()?.amount).toBe(500000);
    expect(result.current.getBudget('nonexistent')).toBeUndefined();
  });

  it('setBudget 创建预算后重新加载', async () => {
    (adapter.getAllBudgets as any).mockResolvedValue([]);

    const { result } = renderHook(() => useBudget('2026-06', adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setBudget('cat_food', 200000);
    });

    expect(adapter.setBudget).toHaveBeenCalled();
    const callArg = (adapter.setBudget as any).mock.calls[0][0];
    expect(callArg.categoryId).toBe('cat_food');
    expect(callArg.amount).toBe(200000);
    expect(callArg.month).toBe('2026-06');
    expect(callArg.id).toBeTruthy();
  });

  it('removeBudget 删除已有预算后重新加载', async () => {
    const budget = { id: 'b1', categoryId: 'cat_food', month: '2026-06', amount: 200000 };
    (adapter.getAllBudgets as any).mockResolvedValue([budget]);

    const { result } = renderHook(() => useBudget('2026-06', adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeBudget('cat_food');
    });

    expect(adapter.deleteBudget).toHaveBeenCalledWith('b1');
  });

  it('removeBudget 不存在的预算不调用 delete', async () => {
    (adapter.getAllBudgets as any).mockResolvedValue([]);

    const { result } = renderHook(() => useBudget('2026-06', adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeBudget('nonexistent');
    });

    expect(adapter.deleteBudget).not.toHaveBeenCalled();
  });

  it('calculateProgress 无总预算返回 null', async () => {
    (adapter.getAllBudgets as any).mockResolvedValue([]);

    const { result } = renderHook(() => useBudget('2026-06', adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const progress = await result.current.calculateProgress();
    expect(progress).toBeNull();
  });

  it('calculateProgress 正确计算预算进度', async () => {
    (adapter.getAllBudgets as any).mockResolvedValue([
      { id: 'b1', categoryId: '__total__', month: '2026-06', amount: 500000 },
    ]);
    const sampleTxs = [
      { id: '1', type: 'expense', amount: 200000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-06-15', createdAt: 1 },
      { id: '2', type: 'income', amount: 100000, categoryId: 'cat_salary', paymentMethod: 'bank_card', date: '2026-06-15', createdAt: 2 },
    ];
    (adapter.getTransactionsByMonth as any).mockResolvedValue(sampleTxs);

    const { result } = renderHook(() => useBudget('2026-06', adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const progress = await result.current.calculateProgress();
    expect(progress).toEqual({
      budget: 500000,
      spent: 200000,
      remaining: 300000,
      percentage: 40,
    });
  });
});
