# CSV Export + Category Icon/Color Customization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CSV export and category icon/color customization (expanded emoji palette, free-text emoji input, 14-color preset, color applied across 6 pages/components).

**Architecture:** Two independent features. CSV: new `src/utils/csv.ts` with `generateCSVContent()` (pure, testable) + `exportCSV()` (DOM download). Category: add `color` field to `Category` model, expand `CategoryForm` (emoji 20→54 + text input + color palette), propagate color dots to Settings/Records/Reports/CategoryPicker/Dashboard.

**Tech Stack:** React 18 + TypeScript + TailwindCSS + Dexie.js + Recharts + Vitest

---

### Task 1: Create CSV utility

**Files:**
- Create: `src/utils/csv.ts`

- [ ] **Step 1: Write the CSV utility file**

```typescript
import { DexieAdapter } from '../adapters/dexie';
import type { Transaction, Category } from '../models';
import { PAYMENT_METHODS } from '../models';

/**
 * 生成 CSV 内容字符串（纯函数，可测试）
 * 包含 UTF-8 BOM，Excel 直接打开不乱码
 */
export function generateCSVContent(
  transactions: Transaction[],
  categories: Category[]
): string {
  const catMap = new Map<string, Category>();
  categories.forEach(c => catMap.set(c.id, c));

  const paymentLabel = new Map(PAYMENT_METHODS.map(p => [p.value, p.label]));

  const typeLabel = (type: string) => (type === 'expense' ? '支出' : '收入');

  const escapeField = (s: string): string => {
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const BOM = '﻿';
  const header = '日期,类型,金额,一级分类,子分类,支付方式,备注';

  const rows = transactions.map(tx => {
    const cat = catMap.get(tx.categoryId);
    // 如果分类是子分类，parentCat 是它的一级分类名，subCat 是子分类名
    // 如果分类是一级分类，parentCat 就是它自己，subCat 为空
    const isSub = cat?.parentId != null;
    const parentCat = isSub ? catMap.get(cat!.parentId!) : cat;

    const fields = [
      tx.date,
      typeLabel(tx.type),
      (tx.amount / 100).toFixed(2),
      parentCat?.name ?? '',
      isSub ? (cat?.name ?? '') : '',
      paymentLabel.get(tx.paymentMethod) ?? tx.paymentMethod,
      tx.note ?? '',
    ];

    return fields.map(escapeField).join(',');
  });

  return BOM + header + '\n' + rows.join('\n');
}

/**
 * 导出 CSV 文件 — 获取全部数据 → 生成 CSV → 触发下载
 */
export async function exportCSV(): Promise<void> {
  const [transactions, categories] = await Promise.all([
    DexieAdapter.getAllTransactions(),
    DexieAdapter.getAllCategories(),
  ]);

  // 按日期排序（最新在前）
  transactions.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  const content = generateCSVContent(transactions, categories);

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `keep-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: no errors.

---

### Task 2: Write CSV unit tests

**Files:**
- Create: `src/utils/__tests__/csv.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { generateCSVContent } from '../csv';
import type { Transaction, Category } from '../../models';

const makeCat = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat_1',
  name: '餐饮',
  type: 'expense',
  icon: '🍜',
  order: 1,
  ...overrides,
});

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx_1',
  type: 'expense',
  amount: 3550, // 35.50 元
  categoryId: 'cat_1',
  paymentMethod: 'wechat',
  date: '2024-06-15',
  createdAt: Date.now(),
  ...overrides,
});

describe('generateCSVContent', () => {
  it('以 UTF-8 BOM 开头', () => {
    const result = generateCSVContent([], []);
    expect(result.startsWith('﻿')).toBe(true);
  });

  it('包含表头行', () => {
    const result = generateCSVContent([], []);
    const lines = result.split('\n');
    expect(lines[0]).toBe('﻿日期,类型,金额,一级分类,子分类,支付方式,备注');
  });

  it('支出 → "支出"', () => {
    const tx = makeTx({ type: 'expense' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    expect(lines[1]).toContain(',支出,');
  });

  it('收入 → "收入"', () => {
    const tx = makeTx({ type: 'income' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    expect(lines[1]).toContain(',收入,');
  });

  it('金额从分转换为元', () => {
    const tx = makeTx({ amount: 3550 });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    // 第3列是金额
    const fields = lines[1].split(',');
    expect(fields[2]).toBe('35.50');
  });

  it('金额 0 分 → 0.00', () => {
    const tx = makeTx({ amount: 0 });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[2]).toBe('0.00');
  });

  it('一级分类名称', () => {
    const cat = makeCat({ name: '餐饮' });
    const tx = makeTx({ categoryId: cat.id });
    const result = generateCSVContent([tx], [cat]);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[3]).toBe('餐饮'); // 一级分类
    expect(fields[4]).toBe('');     // 子分类为空
  });

  it('子分类：一级分类列显示父分类名，子分类列显示子分类名', () => {
    const parent = makeCat({ id: 'parent', name: '餐饮' });
    const sub = makeCat({ id: 'sub', name: '外卖', parentId: 'parent' });
    const tx = makeTx({ categoryId: 'sub' });
    const result = generateCSVContent([tx], [parent, sub]);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[3]).toBe('餐饮'); // 一级分类 = 父分类名
    expect(fields[4]).toBe('外卖'); // 子分类 = 子分类名
  });

  it('支付方式显示中文标签', () => {
    const tx = makeTx({ paymentMethod: 'alipay' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[5]).toBe('支付宝');
  });

  it('空备注 → 空字段', () => {
    const tx = makeTx({ note: undefined });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[6]).toBe('');
  });

  it('含逗号的字段用双引号包裹', () => {
    const tx = makeTx({ note: '午餐,很好吃' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    // 备注列应该被引号包裹
    expect(lines[1]).toContain('"午餐,很好吃"');
  });

  it('含双引号的字段转义', () => {
    const tx = makeTx({ note: '他说"你好"' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    // 双引号应转义为两个双引号
    expect(lines[1]).toContain('"他说""你好"""');
  });

  it('含换行的字段用双引号包裹', () => {
    const tx = makeTx({ note: '第一行\n第二行' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    // 因为有换行，CSV 总行数会增加 (1 header + 1 data line, note field spans)
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('多笔交易 = 多个数据行', () => {
    const txs = [
      makeTx({ id: 'tx_1', date: '2024-06-15' }),
      makeTx({ id: 'tx_2', date: '2024-06-14' }),
    ];
    const result = generateCSVContent(txs, [makeCat()]);
    const lines = result.split('\n');
    expect(lines.length).toBe(3); // header + 2 data rows
  });

  it('空交易列表 → 只有表头', () => {
    const result = generateCSVContent([], [makeCat()]);
    const lines = result.split('\n');
    expect(lines.length).toBe(1); // only header (BOM included)
  });

  it('分类不存在时的容错', () => {
    const tx = makeTx({ categoryId: 'non_existent' });
    const result = generateCSVContent([tx], []);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[3]).toBe(''); // 一级分类为空
    expect(fields[4]).toBe(''); // 子分类为空
  });
});
```

- [ ] **Step 2: Run tests, verify all pass**

```bash
npx vitest run src/utils/__tests__/csv.test.ts
```

Expected: all 14 tests pass.

---

### Task 3: Add CSV export button to Settings

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Add import and handler**

In the imports section (around line 5), add:
```typescript
import { exportCSV } from '../utils/csv';
```

Add the handler after `handleExport` (around line 98):
```typescript
const handleExportCSV = async () => {
  try {
    await exportCSV();
    setImportMsg('CSV 导出成功');
  } catch {
    setImportMsg('CSV 导出失败，请重试');
  }
};
```

In the "数据管理" card (around lines 223-226), add a CSV button:
```tsx
<div className="flex gap-3">
  <button onClick={handleExport} className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium">📤 导出备份</button>
  <button onClick={() => setShowImportConfirm(true)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">📥 恢复备份</button>
</div>
<div className="mt-2">
  <button onClick={handleExportCSV} className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium">📊 导出 CSV</button>
</div>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: no errors.

---

### Task 4: Add `color` field to Category model

**Files:**
- Modify: `src/models/index.ts`

- [ ] **Step 1: Add optional color field**

Change the `Category` interface (line 29-36) to add `color?: string`:

```typescript
export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color?: string;            // hex color e.g. '#3B82F6', optional for backward compat
  order: number;
  parentId?: string;
}
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: no errors (existing code should compile with optional field).

---

### Task 5: Expand CategoryForm (emoji + color)

**Files:**
- Modify: `src/components/CategoryForm.tsx`

- [ ] **Step 1: Rewrite CategoryForm with expanded emoji list, emoji input, and color palette**

```typescript
import { useState } from 'react';
import type { Category } from '../models';

const EMOJI_LIST = [
  // 餐饮 (8)
  '🍜', '🍳', '🥩', '🍕', '🥤', '🍰', '🍲', '🍞',
  // 居住 + 家庭 (4)
  '🏠', '🛏️', '🧹', '🧺',
  // 交通 (6)
  '🚗', '🚌', '🚲', '🚄', '✈️', '🛵',
  // 购物 (6)
  '🛒', '👟', '🎒', '🛍️', '💻', '⌚',
  // 悦己 + 娱乐 (6)
  '🎯', '🎮', '🎸', '🎨', '🎲', '🎵',
  // 人情 + 庆祝 (4)
  '🎁', '🎂', '🎉', '🎊',
  // 医教 (5)
  '💊', '📖', '✏️', '🏥', '💉',
  // 收入 (4)
  '💰', '💼', '📥', '🏦',
  // 其他生活 (7)
  '📌', '🐱', '🐶', '🐰', '⚽', '🏀', '🏋️',
  // 其他 (4)
  '📚', '☕', '🎬', '💳',
];

const COLOR_PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#6B7280',
];

interface Props {
  category?: Category;
  type?: 'expense' | 'income';
  hideType?: boolean;
  onSave: (data: { name: string; icon: string; type: 'expense' | 'income'; color?: string }) => Promise<void>;
  onCancel: () => void;
}

export default function CategoryForm({ category, type: initialType, hideType, onSave, onCancel }: Props) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? EMOJI_LIST[0]);
  const [color, setColor] = useState<string | undefined>(category?.color);
  const [emojiInput, setEmojiInput] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(category?.type ?? initialType ?? 'expense');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('请输入分类名称');
      return;
    }
    if (!icon) {
      setError('请选择图标');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), icon, type, color });
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 从 emoji 输入框提取 emoji
  const handleEmojiInput = (value: string) => {
    setEmojiInput(value);
    // 尝试从输入内容中提取一个 emoji 作为图标
    const emojiMatch = value.match(/[\p{Emoji_Presentation}\p{Emoji}‍]/gu);
    if (emojiMatch) {
      setIcon(emojiMatch[0]);
    }
  };

  return (
    <div className="card p-4 mb-4">
      <h3 className="text-sm font-semibold text-ink mb-3">
        {isEdit ? '编辑分类' : '新增分类'}
      </h3>

      {!isEdit && !hideType && (
        <div className="flex bg-[#f0ece6] rounded-lg p-1 mb-4">
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                type === t ? 'bg-white text-ink shadow-sm' : 'text-gray-400'
              }`}
            >
              {t === 'expense' ? '支出' : '收入'}
            </button>
          ))}
        </div>
      )}

      {/* 图标选择器：6列网格，54个 emoji */}
      <label className="block text-sm text-gray-400 mb-2">图标</label>
      <div className="grid grid-cols-6 gap-2 mb-3">
        {EMOJI_LIST.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => { setIcon(emoji); setEmojiInput(''); }}
            className={`text-xl py-1.5 rounded-lg border transition-colors ${
              icon === emoji
                ? 'bg-blue-50 border-blue-400'
                : 'bg-[#faf9f7] border-border'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* 手动输入 emoji */}
      <label className="block text-sm text-gray-400 mb-2">或直接输入 emoji</label>
      <input
        type="text"
        value={emojiInput}
        onChange={e => handleEmojiInput(e.target.value)}
        placeholder="粘贴 emoji 或按 Win+."
        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm text-ink focus:outline-none focus:border-blue-400 bg-white mb-4"
      />

      {/* 颜色选择器：7列，14色 */}
      <label className="block text-sm text-gray-400 mb-2">颜色（可选）</label>
      <div className="grid grid-cols-7 gap-2 mb-4">
        {COLOR_PALETTE.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(color === c ? undefined : c)}
            className={`w-8 h-8 rounded-full mx-auto transition-all ${
              color === c ? 'ring-2 ring-offset-1 ring-blue-400 scale-110' : 'hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      {/* 名称 */}
      <label className="block text-sm text-gray-400 mb-2">名称</label>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="分类名称"
        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm text-ink focus:outline-none focus:border-blue-400 bg-white mb-4"
      />

      {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-border text-gray-500 text-sm"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className={`flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
            saving || !name.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 active:bg-blue-600'
          }`}
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: no errors. The `onSave` signature change might require updating callers — that's handled in Task 6.

---

### Task 6: Update Settings for category color

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Update handleAddCategory to pass color**

Replace the `handleAddCategory` function (lines 54-79) to include `color`:

```typescript
const handleAddCategory = async (data: { name: string; icon: string; type: 'expense' | 'income'; color?: string }) => {
  if (addForm?.parentId) {
    const siblings = categories.filter(c => c.parentId === addForm.parentId);
    const maxOrder = siblings.reduce((max, c) => Math.max(max, c.order), 0);
    await addCategory({
      id: generateId(),
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
      order: maxOrder + 1,
      parentId: addForm.parentId,
    });
  } else {
    const sameType = categories.filter(c => c.type === data.type && !c.parentId);
    const maxOrder = sameType.reduce((max, c) => Math.max(max, c.order), 0);
    await addCategory({
      id: generateId(),
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
      order: maxOrder + 1,
    });
  }
  setAddForm(null);
};
```

- [ ] **Step 2: Update handleUpdateCategory to pass color**

Replace `handleUpdateCategory` (lines 82-86):

```typescript
const handleUpdateCategory = async (data: { name: string; icon: string; type: 'expense' | 'income'; color?: string }) => {
  if (!editingCategory) return;
  await updateCategory(editingCategory.id, { name: data.name, icon: data.icon, color: data.color });
  setEditingCategory(null);
};
```

- [ ] **Step 3: Add color dots to category list rows**

In the category list rendering (lines 160-175 and 202-209), add a colored dot before the icon:

For the first-level category row (line 168):
```tsx
<span>
  {cat.color && (
    <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle" style={{ backgroundColor: cat.color }} />
  )}
  {cat.icon} {cat.name}
</span>
```

For the sub-category row (line 203):
```tsx
<span className="text-sm text-gray-500">
  {sub.color && (
    <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: sub.color }} />
  )}
  {sub.icon} {sub.name}
</span>
```

- [ ] **Step 4: Verify compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: no errors.

---

### Task 7: Add `color` to CategorySummary in useReports

**Files:**
- Modify: `src/hooks/useReports.ts`

- [ ] **Step 1: Add `color` to CategorySummary interface**

Change the `CategorySummary` interface (lines 7-14):

```typescript
export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  icon: string;
  color?: string;          // from Category.color
  amount: number;
  percentage: number;
  subCategories?: CategorySummary[];
}
```

- [ ] **Step 2: Populate color in getCategoryBreakdown**

In `getCategoryBreakdown`, the parent categories already have `cat.color`. Add `color: cat.color` to the returned summary objects.

Line 83-89 — add `color: cat.color,`:
```typescript
return {
  categoryId: cat.id,
  categoryName: cat.name,
  icon: cat.icon,
  color: cat.color,
  amount,
  percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
  subCategories: subSummaries.length > 0 ? subSummaries : undefined,
};
```

And for sub-summaries (lines 74-81), add `color: sub.color,`:
```typescript
return {
  categoryId: sub.id,
  categoryName: sub.name,
  icon: sub.icon,
  color: sub.color,
  amount: subAmount,
  percentage: totalExpense > 0 ? Math.round((subAmount / totalExpense) * 100) : 0,
};
```

- [ ] **Step 3: Verify compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

---

### Task 8: Propagate colors — Charts (pie chart)

**Files:**
- Modify: `src/pages/Reports.tsx`
- Modify: `src/components/Charts.tsx`

- [ ] **Step 1: Update Reports.tsx — pass colors in pieData**

In Reports.tsx lines 69-73, the `pieData` is built from `breakdown`. Add `color`:

```typescript
const pieData = breakdown.map(b => ({
  name: b.categoryName,
  value: b.amount / 100,
  color: b.color,
  ...b,
}));
```

- [ ] **Step 2: Update Charts.tsx — use category colors for pie slices**

In `Charts.tsx`, update the `pieData` type in `ChartsProps` to include optional `color`:

```typescript
interface ChartsProps {
  pieData: Array<{ name: string; value: number; color?: string; categoryId: string; categoryName: string; icon: string; percentage: number; subCategories?: CategorySummary[] }>;
  // ... rest unchanged
}
```

Then update the `Cell` rendering (line 109-111) to use category color when available:

```typescript
{(drilldownCategory?.subCategories || breakdown).map((item: any, i: number) => (
  <Cell key={i} fill={item.color || COLORS[i % COLORS.length]} />
))}
```

And update the legend dot colors (lines 117-122) to also use category colors:

```typescript
{(drilldownCategory?.subCategories || pieData).map((d: any, i: number) => (
  <span key={d.categoryName || d.name} className="text-xs text-gray-500">
    <span
      className="inline-block w-2 h-2 rounded-full mr-1"
      style={{ background: d.color || COLORS[i % COLORS.length] }}
    />
    {d.categoryName || d.name} {d.percentage}%
  </span>
))}
```

- [ ] **Step 3: Verify compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

---

### Task 9: Propagate colors — Records (filter pills)

**Files:**
- Modify: `src/pages/Records.tsx`

- [ ] **Step 1: Add color to active filter pills**

In Records.tsx, update both expense and income filter pill buttons. For expense pills (lines 239-251), change to use category color when active:

```typescript
{categories
  .filter(c => !c.parentId && c.type === 'expense')
  .map(c => {
    const active = filterCategories.has(c.id);
    return (
      <button
        key={c.id}
        onClick={() => toggleCategory(c.id)}
        className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
          active
            ? 'text-white'
            : 'bg-[#f0ece6] text-gray-500 hover:bg-gray-200'
        }`}
        style={active ? { backgroundColor: c.color || '#3b82f6' } : undefined}
      >
        {c.icon} {c.name}
      </button>
    );
  })}
```

For income pills (lines 254-270):

```typescript
{categories
  .filter(c => c.type === 'income' && !c.parentId)
  .map(c => {
    const active = filterCategories.has(c.id);
    return (
      <button
        key={c.id}
        onClick={() => toggleCategory(c.id)}
        className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
          active
            ? 'text-white'
            : 'bg-[#f0ece6] text-gray-500 hover:bg-gray-200'
        }`}
        style={active ? { backgroundColor: c.color || '#22c55e' } : undefined}
      >
        {c.icon} {c.name}
      </button>
    );
  })}
```

Note: removed `bg-blue-500` from expense and `bg-green-500` from income — both use inline `backgroundColor` with fallback to the original color.

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

---

### Task 10: Propagate colors — CategoryPicker

**Files:**
- Modify: `src/components/CategoryPicker.tsx`

- [ ] **Step 1: Add color dot to category buttons**

In CategoryPicker.tsx, add a small colored bar at the top of each category button when it has a color. Replace the button content (lines 31-44):

```typescript
{topCategories.map(cat => (
  <button
    key={cat.id}
    type="button"
    onClick={() => onCategoryChange(cat.id)}
    className={`flex flex-col items-center py-3 px-1 rounded-xl border transition-colors overflow-hidden ${
      selectedCategoryId === cat.id
        ? 'bg-blue-50 border-blue-400'
        : 'bg-white border-border'
    }`}
  >
    {cat.color && (
      <div
        className="w-full h-1 -mt-3 mb-2"
        style={{ backgroundColor: cat.color }}
      />
    )}
    <span className="text-2xl">{cat.icon}</span>
    <span className="text-xs mt-1 text-ink">{cat.name}</span>
  </button>
))}
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

---

### Task 11: Propagate colors — Dashboard (budget bars)

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add color dot to category budget labels**

In the category budget section (lines 188-217), add a color dot before the category name. Replace line 203:

```typescript
<span>
  {cat?.color && (
    <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: cat.color }} />
  )}
  {cat?.icon} {cat?.name || '未知'}
</span>
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

---

### Task 12: Run all tests and final verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all existing tests pass + 14 new CSV tests pass.

- [ ] **Step 2: Run TypeScript check on entire project**

```bash
npx tsc --noEmit
```

Expected: zero type errors.

- [ ] **Step 3: Build check**

```bash
npx vite build
```

Expected: build succeeds without errors.

- [ ] **Step 4: Commit all changes**

```bash
git add -A
git commit -m "feat: add CSV export and category icon/color customization"
```
