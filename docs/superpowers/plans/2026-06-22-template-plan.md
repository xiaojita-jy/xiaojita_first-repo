# 记账模板 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用户可创建命名记账模板，在记一笔页面一键填充，减少重复录入。

**Architecture:** 新增 `Template` 数据模型 → IAdapter 扩展 4 个模板方法 → Dexie 新增 templates 表（DB v3）→ 新建 `useTemplates` hook → 新建 `TemplatePicker` 组件 → AddRecord/Settings 页面接入。

**Tech Stack:** React 18 + TypeScript (strict) + Dexie.js + TailwindCSS 3 + vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-06-22-template-design.md`

---

### Task 1: 新增 Template 数据模型

**Files:**
- Modify: `src/models/index.ts`

- [ ] **Step 1: 在 models/index.ts 末尾添加 Template 接口**

在 `BudgetAlert` 接口后面、`DEFAULT_EXPENSE_CATEGORIES` 前面添加：

```typescript
export interface Template {
  id: string;
  name: string;              // 用户手动命名
  type: 'expense' | 'income';
  amount: number;            // 单位：分
  categoryId: string;
  subCategoryId?: string;
  paymentMethod: PaymentMethod;
  note?: string;
  order: number;
  createdAt: number;         // Unix timestamp (ms)
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx tsc --noEmit
```

Expected: 无新增错误。

- [ ] **Step 3: Commit**

```bash
git add src/models/index.ts
git commit -m "feat: add Template interface to models"
```

---

### Task 2: 扩展 IAdapter 接口 + Dexie 实现

**Files:**
- Modify: `src/adapters/types.ts`
- Modify: `src/adapters/dexie.ts`

- [ ] **Step 1: IAdapter 新增 4 个模板方法**

在 `src/adapters/types.ts` 的 `deleteBudgetsByCategory` 和 `getBudgetsInRange` 之间添加：

```typescript
  // —— Templates ——
  getAllTemplates(): Promise<Template[]>;
  addTemplate(t: Template): Promise<void>;
  updateTemplate(id: string, data: Partial<Template>): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
```

同时在文件顶部导入 Template 类型，修改 import 行：

```typescript
import type { Transaction, Category, Budget, Template } from '../models';
```

- [ ] **Step 2: Dexie DB 升级到 v3，新增 templates 表**

修改 `src/adapters/dexie.ts`：

（1）`KeepAccountsDB` 类中新增 `templates!` 表声明：

```typescript
class KeepAccountsDB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  settings!: Table<{ key: string; value: string }, string>;
  templates!: Table<Template, string>;  // 新增
```

（2）constructor 中的 version 升级，在 version(2) 后面追加 `.version(3)`：

```typescript
constructor() {
    super('KeepAccountsDB');
    this.version(2).stores({
      transactions: 'id, date, categoryId, type, amount',
      categories: 'id, type, parentId, order',
      budgets: 'id, [month+categoryId]',
      settings: 'key',
    }).upgrade(async tx => {
      // v1→v2: 新增 order 索引，清空旧分类数据后重新播种
      await tx.table('categories').clear();
    });
    this.version(3).stores({
      transactions: 'id, date, categoryId, type, amount',
      categories: 'id, type, parentId, order',
      budgets: 'id, [month+categoryId]',
      settings: 'key',
      templates: 'id, order',  // 新增
    });
  }
```

- [ ] **Step 3: DexieAdapter 实现 4 个模板方法**

在 `DexieAdapter` 对象中，`seedDefaultCategories` 之前添加：

```typescript
  // —— Templates ——
  async getAllTemplates() {
    return db.templates.orderBy('order').toArray();
  },

  async addTemplate(t: Template) {
    await db.templates.add(t);
  },

  async updateTemplate(id: string, data: Partial<Template>) {
    await db.templates.update(id, data);
  },

  async deleteTemplate(id: string) {
    await db.templates.delete(id);
  },
```

同时更新顶部 import，导入 `Template` 类型：

```typescript
import type { Transaction, Category, Budget, Template } from '../models';
```

- [ ] **Step 4: 验证 TypeScript 编译通过**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 5: 运行现有测试确保无回归**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx vitest run
```

Expected: 107 个测试全部通过（无新增失败）。

- [ ] **Step 6: Commit**

```bash
git add src/adapters/types.ts src/adapters/dexie.ts
git commit -m "feat: add template CRUD to IAdapter and Dexie (DB v3)"
```

---

### Task 3: 新建 useTemplates hook + 测试

**Files:**
- Create: `src/hooks/useTemplates.ts`
- Create: `src/hooks/__tests__/useTemplates.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/hooks/__tests__/useTemplates.test.ts`：

```typescript
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
    getSetting: vi.fn(() => Promise.resolve(null)),
    setSetting: vi.fn(() => Promise.resolve()),
    seedDefaultCategories: vi.fn(() => Promise.resolve()),
    getAllTemplates: vi.fn(() => Promise.resolve([])),
    addTemplate: vi.fn(() => Promise.resolve()),
    updateTemplate: vi.fn(() => Promise.resolve()),
    deleteTemplate: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

let useTemplates: typeof import('../useTemplates').useTemplates;
beforeAll(async () => {
  const mod = await import('../useTemplates');
  useTemplates = mod.useTemplates;
});

const sampleTemplates: Template[] = [
  {
    id: 'tpl_1', name: '午餐外卖', type: 'expense', amount: 3000,
    categoryId: 'cat_food', subCategoryId: 'cat_sub_takeout',
    paymentMethod: 'alipay', order: 1, createdAt: 1700000000000,
  },
  {
    id: 'tpl_2', name: '地铁通勤', type: 'expense', amount: 500,
    categoryId: 'cat_transport', paymentMethod: 'wechat',
    order: 2, createdAt: 1700000001000,
  },
  {
    id: 'tpl_3', name: '工资', type: 'income', amount: 2000000,
    categoryId: 'cat_salary', paymentMethod: 'bank_card',
    order: 3, createdAt: 1700000002000,
  },
];

describe('useTemplates', () => {
  let adapter: IAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
    (adapter.getAllTemplates as any).mockResolvedValue(sampleTemplates);
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
        type: 'expense', amount: 1500, categoryId: 'cat_food',
        paymentMethod: 'cash',
      });
    });

    expect(adapter.addTemplate).toHaveBeenCalled();
    const callArg = (adapter.addTemplate as any).mock.calls[0][0];
    expect(callArg.name).toBe('新模板');
    expect(callArg.amount).toBe(1500);
    expect(callArg.order).toBe(4); // max order + 1
    expect(callArg.id).toBeDefined();
    expect(callArg.createdAt).toBeDefined();
    expect(adapter.getAllTemplates).toHaveBeenCalledTimes(2);
  });

  it('add 空列表时 order 为 1', async () => {
    (adapter.getAllTemplates as any).mockResolvedValue([]);
    const { result } = renderHook(() => useTemplates(adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.add('测试', {
        type: 'expense', amount: 1000, categoryId: 'cat_food',
        paymentMethod: 'wechat',
      });
    });

    const callArg = (adapter.addTemplate as any).mock.calls[0][0];
    expect(callArg.order).toBe(1);
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

    // tpl_2 (order=2) 与 tpl_1 (order=1) 交换
    expect(adapter.updateTemplate).toHaveBeenCalledWith('tpl_2', { order: 1 });
    expect(adapter.updateTemplate).toHaveBeenCalledWith('tpl_1', { order: 2 });
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

    // tpl_2 (order=2) 与 tpl_3 (order=3) 交换
    expect(adapter.updateTemplate).toHaveBeenCalledWith('tpl_2', { order: 3 });
    expect(adapter.updateTemplate).toHaveBeenCalledWith('tpl_3', { order: 2 });
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
    (adapter.getAllTemplates as any).mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useTemplates(adapter));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('DB error');
    expect(result.current.templates).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx vitest run src/hooks/__tests__/useTemplates.test.ts
```

Expected: FAIL — `useTemplates` 模块不存在。

- [ ] **Step 3: 实现 useTemplates hook**

创建 `src/hooks/useTemplates.ts`：

```typescript
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

  /** 新增模板，自动分配 order（最大值 + 1） */
  const add = useCallback(async (name: string, fields: TemplateFields) => {
    const maxOrder = templates.reduce((max, t) => Math.max(max, t.order), 0);
    const tpl: Template = {
      id: generateId(),
      name,
      ...fields,
      subCategoryId: fields.subCategoryId || undefined,
      note: fields.note || undefined,
      order: maxOrder + 1,
      createdAt: Date.now(),
    };
    await adapter.addTemplate(tpl);
    await load();
  }, [templates, adapter, load]);

  /** 更新模板 */
  const update = useCallback(async (id: string, data: Partial<Template>) => {
    await adapter.updateTemplate(id, data);
    await load();
  }, [adapter, load]);

  /** 删除模板 */
  const remove = useCallback(async (id: string) => {
    await adapter.deleteTemplate(id);
    await load();
  }, [adapter, load]);

  /** 上移模板 */
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

  /** 下移模板 */
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

  return { templates, loading, error, add, update, remove, moveUp, moveDown, reload: load };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx vitest run src/hooks/__tests__/useTemplates.test.ts
```

Expected: 9 个测试全部 PASS。

- [ ] **Step 5: 运行全部测试确保无回归**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx vitest run
```

Expected: 116 个测试全部通过（107 + 9 新增）。

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTemplates.ts src/hooks/__tests__/useTemplates.test.ts
git commit -m "feat: add useTemplates hook with CRUD and reorder"
```

---

### Task 4: 新建 TemplatePicker 组件

**Files:**
- Create: `src/components/TemplatePicker.tsx`

- [ ] **Step 1: 创建组件**

创建 `src/components/TemplatePicker.tsx`：

```typescript
import { useMemo } from 'react';
import { formatAmount } from '../utils/format';
import EmptyState from './EmptyState';
import type { Template, Category } from '../models';

interface TemplatePickerProps {
  templates: Template[];
  allCategories: Category[];
  onSelect: (template: Template) => void;
  onClose: () => void;
}

export default function TemplatePicker({ templates, allCategories, onSelect, onClose }: TemplatePickerProps) {
  /** 根据 categoryId 查找分类信息 */
  const getCategoryInfo = useMemo(() => {
    const map = new Map<string, Category>();
    for (const cat of allCategories) {
      map.set(cat.id, cat);
    }
    return (id: string): Category | undefined => map.get(id);
  }, [allCategories]);

  /** 格式化模板显示：获取一级分类名和子分类名 */
  const formatCategory = (tpl: Template): string => {
    const cat = getCategoryInfo(tpl.categoryId);
    if (!cat) return '未知分类';
    if (tpl.subCategoryId) {
      const sub = getCategoryInfo(tpl.subCategoryId);
      return sub ? `${cat.name}·${sub.name}` : cat.name;
    }
    // 如果 categoryId 本身是子分类，找父分类
    if (cat.parentId) {
      const parent = getCategoryInfo(cat.parentId);
      return parent ? `${parent.name}·${cat.name}` : cat.name;
    }
    return cat.name;
  };

  const typeLabel = (type: 'expense' | 'income') =>
    type === 'expense' ? '支出' : '收入';

  const typeColor = (type: 'expense' | 'income') =>
    type === 'expense' ? 'text-expense bg-red-50' : 'text-income bg-green-50';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/30" />
      {/* 抽屉 */}
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl max-h-[60vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-sm font-semibold text-ink">选择模板</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="p-4">
          {templates.length === 0 ? (
            <EmptyState
              icon="📋"
              title="暂无模板"
              description="记一笔时可将当前填写保存为模板"
            />
          ) : (
            <div className="space-y-2">
              {templates.map(tpl => {
                const cat = getCategoryInfo(tpl.categoryId);
                return (
                  <button
                    key={tpl.id}
                    onClick={() => onSelect(tpl)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-blue-50 active:bg-blue-100 transition-colors text-left"
                  >
                    {/* 分类图标 */}
                    <span className="text-xl flex-shrink-0">
                      {cat?.icon || '📌'}
                    </span>
                    {/* 模板信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{tpl.name}</div>
                      <div className="text-xs text-gray-400 truncate">{formatCategory(tpl)}</div>
                    </div>
                    {/* 金额 + 类型 */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-semibold tabular-nums ${tpl.type === 'expense' ? 'text-expense' : 'text-income'}`}>
                        {tpl.type === 'expense' ? '-' : '+'}{formatAmount(tpl.amount)}
                      </div>
                      <div className={`text-xs px-1.5 py-0.5 rounded ${typeColor(tpl.type)}`}>
                        {typeLabel(tpl.type)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add src/components/TemplatePicker.tsx
git commit -m "feat: add TemplatePicker bottom-drawer component"
```

---

### Task 5: AddRecord 页面接入模板功能

**Files:**
- Modify: `src/pages/AddRecord.tsx`

- [ ] **Step 1: 修改 AddRecord 页面**

在 `src/pages/AddRecord.tsx` 中：

（1）新增 import：
```typescript
import { useState, useMemo } from 'react';
// ... 已有 imports ...
import TemplatePicker from '../components/TemplatePicker';
import { useTemplates } from '../hooks/useTemplates';
import ConfirmDialog from '../components/ConfirmDialog';
```

（2）在组件函数内，`const { checkAlerts } = useBudget();` 后面添加：
```typescript
  const { templates, add: addTemplate, loading: tplLoading } = useTemplates();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
```

（3）在 `handleSave` 函数后面添加模板相关回调：
```typescript
  const handleSelectTemplate = (tpl: typeof templates[0]) => {
    setType(tpl.type);
    setAmountStr(formatAmount(tpl.amount));
    setCategoryId(tpl.categoryId);
    setSubCategoryId(tpl.subCategoryId);
    setPaymentMethod(tpl.paymentMethod);
    if (tpl.note) setNote(tpl.note);
    setShowTemplatePicker(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !categoryId) return;
    const amount = parseAmountToCents(amountStr);
    if (amount <= 0) return;
    try {
      await addTemplate(templateName.trim(), {
        type,
        amount,
        categoryId: subCategoryId || categoryId,
        subCategoryId: subCategoryId || undefined,
        paymentMethod,
        note: note || undefined,
      });
      setShowSaveTemplate(false);
      setTemplateName('');
      showToast('模板保存成功', 'success');
    } catch {
      showToast('模板保存失败', 'error');
    }
  };
```

（4）在保存按钮 `<button onClick={handleSave}>` 之前，添加模板操作按钮区域：
```tsx
      {/* 模板操作 */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setShowTemplatePicker(true)}
          disabled={tplLoading}
          className="flex-1 py-2.5 rounded-xl border border-blue-200 text-blue-500 text-sm font-medium hover:bg-blue-50 transition-colors"
        >
          📋 使用模板
        </button>
        <button
          onClick={() => { setTemplateName(''); setShowSaveTemplate(true); }}
          disabled={!categoryId || !amountStr}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            categoryId && amountStr
              ? 'border-blue-200 text-blue-500 hover:bg-blue-50'
              : 'border-gray-200 text-gray-300 cursor-not-allowed'
          }`}
        >
          💾 保存为模板
        </button>
      </div>
```

（5）在 JSX 末尾（`</div>` 之前），添加弹窗：
```tsx
      {/* 模板选择弹窗 */}
      {showTemplatePicker && (
        <TemplatePicker
          templates={templates}
          allCategories={allCategories}
          onSelect={handleSelectTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {/* 保存模板命名弹窗 */}
      <ConfirmDialog
        open={showSaveTemplate}
        title="保存为模板"
        message={
          <div>
            <p className="text-sm text-gray-500 mb-2">请输入模板名称：</p>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="例如：午餐外卖"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              autoFocus
            />
          </div>
        }
        onConfirm={handleSaveTemplate}
        onCancel={() => setShowSaveTemplate(false)}
        confirmText="保存"
      />
```

注意：`ConfirmDialog` 的 `message` prop 原本是 `string` 类型。需要确认 ConfirmDialog 是否支持 `ReactNode`。如果不支持，需要改用 state + 内联弹窗来处理命名输入。

- [ ] **Step 2: 检查 ConfirmDialog 的 message 类型**

读取 `src/components/ConfirmDialog.tsx`，确认 `message` prop 的类型。如果是 `string`，则需要改为 `React.ReactNode`：

```typescript
// 如果原来是:
message: string;
// 改为:
message: React.ReactNode;
```

- [ ] **Step 3: 验证 TypeScript 编译通过**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 4: 运行全部测试**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx vitest run
```

Expected: 116 个测试全部通过。

- [ ] **Step 5: Commit**

```bash
git add src/pages/AddRecord.tsx src/components/ConfirmDialog.tsx
git commit -m "feat: add template picker and save-to-template in AddRecord"
```

---

### Task 6: Settings 页面新增模板管理

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: 在 Settings 添加模板管理区块**

在 `src/pages/Settings.tsx` 中，分类管理 `</div>`（即 `</div>` 关闭 card）之后、数据管理 `<div className="card p-4 mb-4">` 之前，插入模板管理区块。

（1）新增 imports：
```typescript
import { useTemplates } from '../hooks/useTemplates';
import { formatAmount } from '../utils/format';
import type { Template } from '../models';
```

（2）在组件内，`useCategories()` 后面添加：
```typescript
  const { templates, update: updateTemplate, remove: removeTemplate, moveUp: moveTplUp, moveDown: moveTplDown } = useTemplates();
  const [editingTemplateName, setEditingTemplateName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [deleteTplTarget, setDeleteTplTarget] = useState<string | null>(null);
```

（3）添加模板删除处理函数：
```typescript
  const handleDeleteTemplate = async () => {
    if (!deleteTplTarget) return;
    await removeTemplate(deleteTplTarget);
    setDeleteTplTarget(null);
  };
```

（4）在分类管理 card 结束后、数据管理 card 之前添加模板管理 JSX：
```tsx
      {/* 模板管理 */}
      <div className="card p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-ink">模板管理</h2>
        </div>

        {templates.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">暂无模板，记一笔时可保存为模板</p>
        ) : (
          <div className="space-y-1">
            {templates.sort((a, b) => a.order - b.order).map(tpl => {
              const cat = categories.find(c => c.id === tpl.categoryId);
              const isEditing = editingTemplateName === tpl.id;

              // 获取完整分类名
              let catName = cat?.name || '未知';
              if (tpl.subCategoryId) {
                const sub = categories.find(c => c.id === tpl.subCategoryId);
                catName = sub ? `${catName}·${sub.name}` : catName;
              } else if (cat?.parentId) {
                const parent = categories.find(c => c.id === cat.parentId);
                catName = parent ? `${parent.name}·${catName}` : catName;
              }

              const sortedTpls = [...templates].sort((a, b) => a.order - b.order);
              const idx = sortedTpls.findIndex(t => t.id === tpl.id);

              return (
                <div key={tpl.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg flex-shrink-0">{cat?.icon || '📌'}</span>
                    <div className="min-w-0">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={e => setEditNameValue(e.target.value)}
                          onBlur={async () => {
                            if (editNameValue.trim() && editNameValue.trim() !== tpl.name) {
                              await updateTemplate(tpl.id, { name: editNameValue.trim() });
                            }
                            setEditingTemplateName(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingTemplateName(null);
                          }}
                          className="text-sm font-medium text-ink bg-gray-50 px-2 py-0.5 rounded w-full focus:outline-none focus:bg-blue-50"
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm font-medium text-ink truncate">{tpl.name}</div>
                      )}
                      <div className="text-xs text-gray-400 truncate">{catName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold tabular-nums ${tpl.type === 'expense' ? 'text-expense' : 'text-income'}`}>
                      {tpl.type === 'expense' ? '-' : '+'}{formatAmount(tpl.amount)}
                    </span>
                    <span className={`text-xs px-1 py-0.5 rounded ${tpl.type === 'expense' ? 'text-red-500 bg-red-50' : 'text-green-500 bg-green-50'}`}>
                      {tpl.type === 'expense' ? '支出' : '收入'}
                    </span>
                    <button
                      onClick={() => { setEditNameValue(tpl.name); setEditingTemplateName(tpl.id); }}
                      className="text-xs text-blue-400"
                    >✏️</button>
                    <button
                      onClick={() => setDeleteTplTarget(tpl.id)}
                      className="text-xs text-red-400"
                    >🗑️</button>
                    <button
                      onClick={() => moveTplUp(tpl.id)}
                      disabled={idx <= 0}
                      className={`text-xs ${idx <= 0 ? 'text-gray-300 cursor-default' : 'text-gray-500 hover:text-ink cursor-pointer'}`}
                      title="上移"
                    >↑</button>
                    <button
                      onClick={() => moveTplDown(tpl.id)}
                      disabled={idx >= sortedTpls.length - 1}
                      className={`text-xs ${idx >= sortedTpls.length - 1 ? 'text-gray-300 cursor-default' : 'text-gray-500 hover:text-ink cursor-pointer'}`}
                      title="下移"
                    >↓</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
```

（5）在 Settings 的 `return` 末尾（`</div>` 根元素之前），添加模板删除确认弹窗：
```tsx
      <ConfirmDialog
        open={!!deleteTplTarget}
        title="删除模板"
        message="确定要删除该模板吗？"
        onConfirm={handleDeleteTemplate}
        onCancel={() => setDeleteTplTarget(null)}
      />
```

- [ ] **Step 3: 验证 TypeScript 编译通过**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 4: 运行全部测试**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx vitest run
```

Expected: 116 个测试全部通过。

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: add template management section in Settings"
```

---

### Task 7: 备份导出/导入包含模板数据

**Files:**
- Modify: `src/utils/backup.ts`

- [ ] **Step 1: 更新 BackupData 接口和导出逻辑**

修改 `src/utils/backup.ts`：

（1）`BackupData` 接口新增 `templates` 字段，版本升到 2：
```typescript
interface BackupData {
  version: 2;
  exportedAt: string;
  transactions: any[];
  categories: any[];
  budgets: any[];
  templates: any[];
}
```

（2）`exportBackup` 函数中，收集模板数据：
```typescript
export async function exportBackup(): Promise<void> {
  const [transactions, categories, budgets, templates] = await Promise.all([
    DexieAdapter.getAllTransactions(),
    DexieAdapter.getAllCategories(),
    collectAllBudgets(),
    DexieAdapter.getAllTemplates(),
  ]);

  const backup: BackupData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    budgets,
    templates,
  };
  // ... 后续逻辑不变
```

（3）`importBackup` 函数中，处理模板导入（版本兼容：支持 v1 和 v2）：
```typescript
        if (data.version !== 1 && data.version !== 2) throw new Error('备份文件版本不兼容');
        if (!Array.isArray(data.transactions)) throw new Error('备份文件格式错误：缺少交易数据');
        if (!Array.isArray(data.categories)) throw new Error('备份文件格式错误：缺少分类数据');

        // 清空现有数据再导入
        await db.transactions.clear();
        await db.categories.clear();
        await db.budgets.clear();
        await db.templates.clear();

        for (const cat of data.categories) {
          await DexieAdapter.addCategory(cat);
        }
        for (const tx of data.transactions) {
          await DexieAdapter.addTransaction(tx);
        }
        if (Array.isArray(data.budgets)) {
          for (const budget of data.budgets) {
            await DexieAdapter.setBudget(budget);
          }
        }
        // v2 支持模板导入
        if (Array.isArray(data.templates)) {
          for (const tpl of data.templates) {
            await DexieAdapter.addTemplate(tpl);
          }
        }
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3: 运行全部测试**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx vitest run
```

Expected: 116 个测试全部通过。

- [ ] **Step 4: Commit**

```bash
git add src/utils/backup.ts
git commit -m "feat: include templates in backup export/import (v2)"
```

---

### Task 8: 最终验证

- [ ] **Step 1: 运行全部测试**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx vitest run
```

Expected: 116 个测试全部通过。

- [ ] **Step 2: TypeScript 编译检查**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3: 构建检查**

```bash
cd "D:/BaiduSyncdisk/02_AI/2.1_Claude Code/2.1.2_Deepseek/Keep_Accounts" && npm run build
```

Expected: 构建成功，无 error。

- [ ] **Step 4: Commit（如有未提交变更）**

```bash
git status
git add -A
git commit -m "chore: final verification after template feature"
```

---

## 文件变更汇总

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/models/index.ts` | 修改 | 新增 Template 接口 |
| `src/adapters/types.ts` | 修改 | IAdapter 新增 4 个模板方法 |
| `src/adapters/dexie.ts` | 修改 | DB v3 + templates 表 + 实现 |
| `src/hooks/useTemplates.ts` | **新建** | 模板 CRUD + 排序 hook |
| `src/hooks/__tests__/useTemplates.test.ts` | **新建** | 9 个测试 |
| `src/components/TemplatePicker.tsx` | **新建** | 模板选择弹窗组件 |
| `src/components/ConfirmDialog.tsx` | 修改 | message prop 改为 ReactNode |
| `src/pages/AddRecord.tsx` | 修改 | 接入"使用模板""保存为模板" |
| `src/pages/Settings.tsx` | 修改 | 新增模板管理区块 |
| `src/utils/backup.ts` | 修改 | 备份 v2 包含模板 |
