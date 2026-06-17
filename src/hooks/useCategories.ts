import { useState, useEffect, useCallback } from 'react';
import { DexieAdapter } from '../adapters/dexie';
import { ALL_DEFAULT_CATEGORIES } from '../models';
import type { Category } from '../models';
import type { IAdapter } from '../adapters/types';

export function useCategories(adapter: IAdapter = DexieAdapter) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await adapter.seedDefaultCategories(ALL_DEFAULT_CATEGORIES);
      const all = await adapter.getAllCategories();
      setCategories(all);
    } catch (e: any) {
      console.error('useCategories load failed:', e);
      setError(e.message || '加载分类失败');
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.parentId);
  const incomeCategories = categories.filter(c => c.type === 'income');
  const getSubs = useCallback(
    (parentId: string) => categories.filter(c => c.parentId === parentId),
    [categories]
  );
  const getById = useCallback(
    (id: string) => categories.find(c => c.id === id),
    [categories]
  );

  const addCategory = useCallback(async (cat: Category) => {
    await adapter.addCategory(cat);
    await load();
  }, [load, adapter]);

  const updateCategory = useCallback(async (id: string, data: Partial<Category>) => {
    await adapter.updateCategory(id, data);
    await load();
  }, [load, adapter]);

  const deleteCategory = useCallback(async (id: string) => {
    const count = await adapter.getTransactionCountByCategory(id);
    if (count > 0) {
      throw new Error(`该分类下有 ${count} 条记录，请先迁移`);
    }
    await adapter.deleteCategory(id);
    await load();
  }, [load, adapter]);

  return {
    categories, loading, error,
    expenseCategories, incomeCategories,
    getSubs, getById,
    addCategory, updateCategory, deleteCategory,
    reload: load,
  };
}
