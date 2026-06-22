import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { IAdapter } from '../../adapters/types';
import type { CategorySummary, Anomaly } from '../useReports';

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

let useReports: typeof import('../useReports').useReports;
beforeAll(async () => {
  const mod = await import('../useReports');
  useReports = mod.useReports;
});

const sampleExpenseCategories = [
  { id: 'cat_food', name: '餐饮', type: 'expense' as const, icon: '🍜', order: 1 },
  { id: 'cat_transport', name: '交通', type: 'expense' as const, icon: '🚗', order: 2 },
  { id: 'cat_takeout', name: '外卖', type: 'expense' as const, icon: '🥡', order: 1, parentId: 'cat_food' },
  { id: 'cat_dineout', name: '外食', type: 'expense' as const, icon: '🍽️', order: 2, parentId: 'cat_food' },
];

describe('useReports', () => {
  let adapter: IAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  it('mount 时加载近 6 月汇总', async () => {
    (adapter.getTransactionsByMonth as any).mockResolvedValue([]);

    const { result } = renderHook(() => useReports(adapter));

    await waitFor(() => {
      expect(result.current.monthlySummaries).toBeDefined();
    });

    expect((adapter.getTransactionsByMonth as any).mock.calls.length).toBe(6);
  });

  it('getCategoryBreakdown 无支出时返回空数组', async () => {
    (adapter.getTransactionsByMonth as any).mockResolvedValue([]);
    (adapter.getAllCategories as any).mockResolvedValue([]);

    const { result } = renderHook(() => useReports(adapter));

    let breakdown: CategorySummary[] = [];
    await act(async () => {
      breakdown = await result.current.getCategoryBreakdown('2026-06');
    });
    expect(breakdown).toEqual([]);
  });

  it('getCategoryBreakdown 正确计算分类占比', async () => {
    const txs = [
      { id: '1', type: 'expense', amount: 50000, categoryId: 'cat_takeout', paymentMethod: 'wechat', date: '2026-06-15', createdAt: 1 },
      { id: '2', type: 'expense', amount: 50000, categoryId: 'cat_dineout', paymentMethod: 'wechat', date: '2026-06-16', createdAt: 2 },
      { id: '3', type: 'expense', amount: 100000, categoryId: 'cat_transport', paymentMethod: 'cash', date: '2026-06-17', createdAt: 3 },
      { id: '4', type: 'income', amount: 500000, categoryId: 'cat_salary', paymentMethod: 'bank_card', date: '2026-06-15', createdAt: 4 },
    ];
    (adapter.getTransactionsByMonth as any).mockResolvedValue(txs);
    (adapter.getAllCategories as any).mockResolvedValue(sampleExpenseCategories);

    const { result } = renderHook(() => useReports(adapter));

    let breakdown: CategorySummary[] = [];
    await act(async () => {
      breakdown = await result.current.getCategoryBreakdown('2026-06');
    });

    expect(breakdown).toHaveLength(2);

    const food = breakdown.find(b => b.categoryId === 'cat_food')!;
    expect(food.amount).toBe(100000);
    expect(food.percentage).toBe(50);
    expect(food.subCategories).toHaveLength(2);

    const transport = breakdown.find(b => b.categoryId === 'cat_transport')!;
    expect(transport.amount).toBe(100000);
    expect(transport.percentage).toBe(50);
    expect(transport.subCategories).toBeUndefined();
  });

  it('getAnomalies 偏差超过 50% 时返回异常', async () => {
    const currentTxs = [
      { id: '1', type: 'expense', amount: 100000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-06-15', createdAt: 1 },
    ];
    const pastTxs = [
      { id: '2', type: 'expense', amount: 20000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-05-15', createdAt: 2 },
    ];

    (adapter.getCategoriesByType as any).mockResolvedValue(
      sampleExpenseCategories.filter(c => c.type === 'expense' && !c.parentId)
    );
    (adapter.getTransactionsByCategory as any)
      .mockResolvedValueOnce(currentTxs)
      .mockResolvedValueOnce(pastTxs)
      .mockResolvedValueOnce(pastTxs)
      .mockResolvedValueOnce(pastTxs);

    const { result } = renderHook(() => useReports(adapter));

    let anomalies: Anomaly[] = [];
    await act(async () => {
      anomalies = await result.current.getAnomalies('2026-06');
    });
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].categoryId).toBe('cat_food');
    expect(anomalies[0].deviation).toBe(400);
  });

  it('getAnomalies 偏差不超过 50% 不返回异常', async () => {
    const txs = [
      { id: '1', type: 'expense', amount: 25000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-06-15', createdAt: 1 },
    ];
    const pastTxs = [
      { id: '2', type: 'expense', amount: 20000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-05-15', createdAt: 2 },
    ];

    (adapter.getCategoriesByType as any).mockResolvedValue(
      sampleExpenseCategories.filter(c => c.type === 'expense' && !c.parentId)
    );
    (adapter.getTransactionsByCategory as any)
      .mockResolvedValueOnce(txs)
      .mockResolvedValueOnce(pastTxs)
      .mockResolvedValueOnce(pastTxs)
      .mockResolvedValueOnce(pastTxs);

    const { result } = renderHook(() => useReports(adapter));

    let anomalies: Anomaly[] = [];
    await act(async () => {
      anomalies = await result.current.getAnomalies('2026-06');
    });
    expect(anomalies).toHaveLength(0);
  });

  it('getAnomalies 前 3 月无数据时不报异常', async () => {
    (adapter.getCategoriesByType as any).mockResolvedValue(
      sampleExpenseCategories.filter(c => c.type === 'expense' && !c.parentId)
    );
    (adapter.getTransactionsByCategory as any)
      .mockResolvedValueOnce([{ id: '1', type: 'expense', amount: 50000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-06-15', createdAt: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => useReports(adapter));

    let anomalies: Anomaly[] = [];
    await act(async () => {
      anomalies = await result.current.getAnomalies('2026-06');
    });
    expect(anomalies).toHaveLength(0);
  });
});
