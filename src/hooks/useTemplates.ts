import { useState, useEffect, useCallback } from 'react';
import { DexieAdapter } from '../adapters/dexie';
import { generateId } from '../utils/format';
import type { Template, PaymentMethod } from '../models';
import type { IAdapter } from '../adapters/types';

export interface TemplateFields {
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  subCategoryId?: string;
  paymentMethod: PaymentMethod;
  note?: string;
}

export function useTemplates(adapter: IAdapter = DexieAdapter) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await adapter.getAllTemplates();
      setTemplates(all);
    } catch (e: any) {
      console.error('useTemplates load failed:', e);
      setError(e.message || '加载模板失败');
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (name: string, fields: TemplateFields) => {
    const sorted = [...templates].sort((a, b) => a.order - b.order);
    const maxOrder = sorted.length > 0 ? sorted[sorted.length - 1].order : 0;
    const template: Template = {
      id: generateId(),
      name,
      ...fields,
      order: maxOrder + 1,
      createdAt: Date.now(),
    };
    await adapter.addTemplate(template);
    await load();
  }, [templates, adapter, load]);

  const update = useCallback(async (id: string, data: Partial<Template>) => {
    await adapter.updateTemplate(id, data);
    await load();
  }, [adapter, load]);

  const remove = useCallback(async (id: string) => {
    await adapter.deleteTemplate(id);
    await load();
  }, [adapter, load]);

  const moveUp = useCallback(async (id: string) => {
    const target = templates.find(t => t.id === id);
    if (!target) return;
    const sorted = [...templates].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(t => t.id === id);
    if (idx <= 0) return;
    const prev = sorted[idx - 1];
    await adapter.updateTemplate(target.id, { order: prev.order });
    await adapter.updateTemplate(prev.id, { order: target.order });
    await load();
  }, [templates, adapter, load]);

  const moveDown = useCallback(async (id: string) => {
    const target = templates.find(t => t.id === id);
    if (!target) return;
    const sorted = [...templates].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(t => t.id === id);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const next = sorted[idx + 1];
    await adapter.updateTemplate(target.id, { order: next.order });
    await adapter.updateTemplate(next.id, { order: target.order });
    await load();
  }, [templates, adapter, load]);

  return {
    templates, loading, error,
    add, update, remove,
    moveUp, moveDown,
    reload: load,
  };
}
