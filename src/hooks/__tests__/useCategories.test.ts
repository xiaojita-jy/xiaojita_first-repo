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

let useCategories: typeof import('../useCategories').useCategories;
beforeAll(async () => {
  const mod = await import('../useCategories');
  useCategories = mod.useCategories;
});

const sampleCategories = [
  { id: 'cat_food', name: '餐饮', type: 'expense' as const, icon: '🍜', order: 1 },
  { id: 'cat_transport', name: '交通', type: 'expense' as const, icon: '🚗', order: 2 },
  { id: 'cat_salary', name: '工资', type: 'income' as const, icon: '💰', order: 1 },
  { id: 'cat_sub_takeout', name: '外卖', type: 'expense' as const, icon: '🥡', order: 1, parentId: 'cat_food' },
];

describe('useCategories', () => {
  let adapter: IAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
    (adapter.getAllCategories as any).mockResolvedValue(sampleCategories);
  });

  it('挂载时播种默认分类并加载', async () => {
    const { result } = renderHook(() => useCategories(adapter));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(adapter.seedDefaultCategories).toHaveBeenCalled();
    expect(adapter.getAllCategories).toHaveBeenCalled();
    expect(result.current.categories).toHaveLength(4);
  });

  it('expenseCategories 只返回一级支出分类', async () => {
    const { result } = renderHook(() => useCategories(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.expenseCategories).toHaveLength(2);
    expect(result.current.expenseCategories.every(c => c.type === 'expense' && !c.parentId)).toBe(true);
  });

  it('incomeCategories 只返回收入分类', async () => {
    const { result } = renderHook(() => useCategories(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.incomeCategories).toHaveLength(1);
    expect(result.current.incomeCategories[0].id).toBe('cat_salary');
  });

  it('getSubs 根据 parentId 返回子分类', async () => {
    const { result } = renderHook(() => useCategories(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const subs = result.current.getSubs('cat_food');
    expect(subs).toHaveLength(1);
    expect(subs[0].name).toBe('外卖');
  });

  it('getById 根据 id 返回分类', async () => {
    const { result } = renderHook(() => useCategories(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const cat = result.current.getById('cat_transport');
    expect(cat).toBeDefined();
    expect(cat?.name).toBe('交通');
  });

  it('addCategory 调用 adapter 后重新加载', async () => {
    const { result } = renderHook(() => useCategories(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newCat = { id: 'cat_new', name: '新分类', type: 'expense' as const, icon: '📌', order: 100 };
    await act(async () => {
      await result.current.addCategory(newCat);
    });

    expect(adapter.addCategory).toHaveBeenCalledWith(newCat);
    expect(adapter.getAllCategories).toHaveBeenCalledTimes(2);
  });

  it('updateCategory 调用 adapter 后重新加载', async () => {
    const { result } = renderHook(() => useCategories(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateCategory('cat_food', { name: '美食' });
    });

    expect(adapter.updateCategory).toHaveBeenCalledWith('cat_food', { name: '美食' });
  });

  it('deleteCategory 无交易记录时成功删除', async () => {
    (adapter.getTransactionCountByCategory as any).mockResolvedValue(0);
    const { result } = renderHook(() => useCategories(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteCategory('cat_food');
    });

    expect(adapter.deleteCategory).toHaveBeenCalledWith('cat_food');
  });

  it('deleteCategory 有交易记录时抛出错误', async () => {
    (adapter.getTransactionCountByCategory as any).mockResolvedValue(5);
    const { result } = renderHook(() => useCategories(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(act(async () => {
      await result.current.deleteCategory('cat_food');
    })).rejects.toThrow('5 条记录');
  });
});
