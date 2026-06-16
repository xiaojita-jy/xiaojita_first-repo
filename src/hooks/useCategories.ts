import { useState, useEffect, useCallback } from 'react';
import { DexieAdapter } from '../adapters/dexie';
import { ALL_DEFAULT_CATEGORIES } from '../models';
import type { Category } from '../models';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await DexieAdapter.seedDefaultCategories(ALL_DEFAULT_CATEGORIES);
      const all = await DexieAdapter.getAllCategories();
      setCategories(all);
    } catch (e: any) {
      console.error('useCategories load failed:', e);
      setError(e.message || '加载分类失败');
    } finally {
      setLoading(false);
    }
  }, []);

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
    await DexieAdapter.addCategory(cat);
    await load();
  }, [load]);

  const updateCategory = useCallback(async (id: string, data: Partial<Category>) => {
    await DexieAdapter.updateCategory(id, data);
    await load();
  }, [load]);

  const deleteCategory = useCallback(async (id: string) => {
    const count = await DexieAdapter.getTransactionCountByCategory(id);
    if (count > 0) {
      throw new Error(`该分类下有 ${count} 条记录，请先迁移`);
    }
    await DexieAdapter.deleteCategory(id);
    await load();
  }, [load]);

  return {
    categories, loading, error,
    expenseCategories, incomeCategories,
    getSubs, getById,
    addCategory, updateCategory, deleteCategory,
    reload: load,
  };
}
