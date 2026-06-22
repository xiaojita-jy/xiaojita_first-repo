import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { IAdapter } from '../../adapters/types';
import type { Template } from '../../models';

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
    getBudgetsInRange: vi.fn(() => Promise.resolve([])),
    setBudget: vi.fn(() => Promise.resolve()),
    deleteBudget: vi.fn(() => Promise.resolve()),
    deleteBudgetsByCategory: vi.fn(() => Promise.resolve()),
    getAllTemplates: vi.fn(() => Promise.resolve([])),
    addTemplate: vi.fn(() => Promise.resolve()),
    updateTemplate: vi.fn(() => Promise.resolve()),
    deleteTemplate: vi.fn(() => Promise.resolve()),
    getSetting: vi.fn(() => Promise.resolve(null)),
    setSetting: vi.fn(() => Promise.resolve()),
    seedDefaultCategories: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

let useTemplates: typeof import('../useTemplates').useTemplates;
beforeAll(async () => {
  const mod = await import('../useTemplates');
  useTemplates = mod.useTemplates;
});

const sampleTemplates: Template[] = [
  { id: 'tpl_1', name: '午餐外卖', type: 'expense', amount: 3000, categoryId: 'cat_food', subCategoryId: 'cat_sub_takeout', paymentMethod: 'alipay', order: 1, createdAt: 1700000000000 },
  { id: 'tpl_2', name: '地铁通勤', type: 'expense', amount: 500, categoryId: 'cat_transport', paymentMethod: 'wechat', order: 2, createdAt: 1700000001000 },
  { id: 'tpl_3', name: '工资', type: 'income', amount: 2000000, categoryId: 'cat_salary', paymentMethod: 'bank_card', order: 3, createdAt: 1700000002000 },
];

describe('useTemplates', () => {
  let adapter: IAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
    (adapter.getAllTemplates as any).mockResolvedValue([...sampleTemplates]);
  });

  it('挂载时加载模板列表', async () => {
    const { result } = renderHook(() => useTemplates(adapter));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(adapter.getAllTemplates).toHaveBeenCalled();
    expect(result.current.templates).toHaveLength(3);
  });

  it('add 创建模板并重新加载', async () => {
    const { result } = renderHook(() => useTemplates(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.add('新模板', {
        type: 'expense',
        amount: 1000,
        categoryId: 'cat_food',
        subCategoryId: 'cat_sub_takeout',
        paymentMethod: 'alipay',
      });
    });

    expect(adapter.addTemplate).toHaveBeenCalled();
    const addedTemplate = (adapter.addTemplate as any).mock.calls[0][0];
    expect(addedTemplate.name).toBe('新模板');
    expect(addedTemplate.amount).toBe(1000);
    expect(addedTemplate.order).toBe(4);
    expect(addedTemplate.id).toBeDefined();
    expect(addedTemplate.createdAt).toBeDefined();
    expect(adapter.getAllTemplates).toHaveBeenCalledTimes(2);
  });

  it('add 空列表时 order 为 1', async () => {
    (adapter.getAllTemplates as any).mockResolvedValue([]);
    const { result } = renderHook(() => useTemplates(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.add('第一个模板', {
        type: 'income',
        amount: 500000,
        categoryId: 'cat_salary',
        paymentMethod: 'bank_card',
      });
    });

    const addedTemplate = (adapter.addTemplate as any).mock.calls[0][0];
    expect(addedTemplate.order).toBe(1);
  });

  it('update 更新模板字段', async () => {
    const { result } = renderHook(() => useTemplates(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update('tpl_1', { name: '升级版午餐' });
    });

    expect(adapter.updateTemplate).toHaveBeenCalledWith('tpl_1', { name: '升级版午餐' });
    expect(adapter.getAllTemplates).toHaveBeenCalledTimes(2);
  });

  it('remove 删除模板', async () => {
    const { result } = renderHook(() => useTemplates(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove('tpl_1');
    });

    expect(adapter.deleteTemplate).toHaveBeenCalledWith('tpl_1');
    expect(adapter.getAllTemplates).toHaveBeenCalledTimes(2);
  });

  it('moveUp 与上一个模板交换 order', async () => {
    const { result } = renderHook(() => useTemplates(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.moveUp('tpl_2');
    });

    // tpl_2 (order 2) swaps with tpl_1 (order 1)
    expect(adapter.updateTemplate).toHaveBeenCalledTimes(2);
    expect(adapter.updateTemplate).toHaveBeenCalledWith('tpl_2', { order: 1 });
    expect(adapter.updateTemplate).toHaveBeenCalledWith('tpl_1', { order: 2 });
    expect(adapter.getAllTemplates).toHaveBeenCalledTimes(2);
  });

  it('moveUp 首个模板无操作', async () => {
    const { result } = renderHook(() => useTemplates(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.moveUp('tpl_1');
    });

    expect(adapter.updateTemplate).not.toHaveBeenCalled();
  });

  it('moveDown 与下一个模板交换 order', async () => {
    const { result } = renderHook(() => useTemplates(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.moveDown('tpl_2');
    });

    // tpl_2 (order 2) swaps with tpl_3 (order 3)
    expect(adapter.updateTemplate).toHaveBeenCalledTimes(2);
    expect(adapter.updateTemplate).toHaveBeenCalledWith('tpl_2', { order: 3 });
    expect(adapter.updateTemplate).toHaveBeenCalledWith('tpl_3', { order: 2 });
    expect(adapter.getAllTemplates).toHaveBeenCalledTimes(2);
  });

  it('moveDown 末个模板无操作', async () => {
    const { result } = renderHook(() => useTemplates(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.moveDown('tpl_3');
    });

    expect(adapter.updateTemplate).not.toHaveBeenCalled();
  });

  it('adapter 加载失败时设置 error', async () => {
    (adapter.getAllTemplates as any).mockRejectedValue(new Error('数据库连接失败'));

    const { result } = renderHook(() => useTemplates(adapter));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });
});
