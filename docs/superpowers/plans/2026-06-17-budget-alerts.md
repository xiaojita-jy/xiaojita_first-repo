# 预算超支提醒 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 当记一笔支出导致预算超 80% 或 100% 阈值时，主动弹出 Toast 提醒，并在 Dashboard 显示预警汇总。

**Architecture:** CustomEvent 事件总线解耦——页面触发 `showToast()`，Layout 监听并渲染 Toast。useBudget 新增 `checkAlerts(categories)` 方法，返回超阈值预警列表。AddRecord/Records 保存后调用检查并弹 toast，Dashboard 顶部汇总所有预警。

**Tech Stack:** React 18 + TypeScript + TailwindCSS 3

---

### Task 1: 新增 BudgetAlert 类型

**Files:**
- Modify: `src/models/index.ts` — 在 Budget 接口后追加

- [ ] **Step 1: 添加 BudgetAlert 类型**

```ts
// 在 Budget 接口定义之后追加：
export interface BudgetAlert {
  categoryId: string | undefined;  // undefined = 总预算
  categoryName: string;
  categoryIcon: string;
  level: 'warning' | 'danger';     // 黄牌/红牌
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit src/models/index.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/models/index.ts
git commit -m "feat: add BudgetAlert type to models"
```

---

### Task 2: 创建 Toast 事件工具

**Files:**
- Create: `src/utils/toast.ts`

- [ ] **Step 1: 创建 toast.ts**

```ts
export interface ToastMessage {
  id: string;
  type: 'warning' | 'danger';
  message: string;
}

const TOAST_EVENT = 'keep_accounts::toast';

export function showToast(message: string, type: 'warning' | 'danger'): void {
  const detail: ToastMessage = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message,
    type,
  };
  window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, { detail }));
}

export function onToast(callback: (toast: ToastMessage) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent<ToastMessage>).detail);
  window.addEventListener(TOAST_EVENT, handler);
  return () => window.removeEventListener(TOAST_EVENT, handler);
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit src/utils/toast.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/toast.ts
git commit -m "feat: add toast event bus utility"
```

---

### Task 3: 添加 Toast 滑入动画

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: tailwind.config.js 添加 keyframes**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#faf9f7',
        ink: '#1b1b1b',
        border: '#e8e4dd',
        expense: '#dc2626',
        income: '#059669',
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-out': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-16px)', opacity: '0' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.25s ease-out',
        'slide-out': 'slide-out 0.25s ease-in forwards',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: add toast slide-in/out animations"
```

---

### Task 4: 创建 Toast 组件

**Files:**
- Create: `src/components/Toast.tsx`

- [ ] **Step 1: 创建 Toast.tsx**

```tsx
import { useEffect, useState, useCallback } from 'react';
import type { ToastMessage } from '../utils/toast';
import { onToast } from '../utils/toast';

export default function ToastContainer() {
  const [toasts, setToasts] = useState<(ToastMessage & { exiting?: boolean })[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  }, []);

  useEffect(() => {
    return onToast((toast) => {
      setToasts(prev => [{ ...toast, exiting: false }, ...prev]);
      setTimeout(() => dismiss(toast.id), 3000);
    });
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto cursor-pointer ${
            toast.type === 'danger'
              ? 'bg-red-500 text-white'
              : 'bg-amber-500 text-white'
          } ${toast.exiting ? 'animate-slide-out' : 'animate-slide-in'}`}
          onClick={() => dismiss(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit src/components/Toast.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Toast.tsx
git commit -m "feat: add Toast component with slide animation"
```

---

### Task 5: Layout 集成 Toast 容器

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: 在 Layout 中挂载 ToastContainer**

```tsx
import { NavLink, Outlet } from 'react-router-dom';
import ToastContainer from './Toast';

const tabs = [
  { to: '/', label: '概览', icon: '📊' },
  { to: '/add', label: '记账', icon: '➕' },
  { to: '/calendar', label: '日历', icon: '📅' },
  { to: '/records', label: '流水', icon: '📋' },
  { to: '/reports', label: '报表', icon: '📈' },
  { to: '/settings', label: '我的', icon: '⚙️' },
];

export default function Layout() {
  return (
    <div className="min-h-screen pb-16 bg-paper">
      <ToastContainer />
      <main className="max-w-lg mx-auto">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-border z-50">
        <div className="max-w-lg mx-auto flex justify-around">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`
              }
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="mt-0.5">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: mount ToastContainer in Layout"
```

---

### Task 6: useBudget 新增 checkAlerts 方法

**Files:**
- Modify: `src/hooks/useBudget.ts`

- [ ] **Step 1: 添加 checkAlerts 实现**

在现有 imports 中添加 `Category` 和 `BudgetAlert`：
```ts
import type { Budget, Category, BudgetAlert } from '../models';
```

在 `calculateProgress` 函数之后、return 之前添加：

```ts
const checkAlerts = useCallback(async (categories: Category[]): Promise<BudgetAlert[]> => {
  const txs = await adapter.getTransactionsByMonth(currentMonth);
  const alerts: BudgetAlert[] = [];

  for (const budget of budgets) {
    if (budget.amount <= 0) continue;

    const isTotal = !budget.categoryId || budget.categoryId === '__total__';
    let catName = '月度总预算';
    let catIcon = '💰';
    let spent = 0;

    if (isTotal) {
      spent = txs
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);
    } else {
      const cat = categories.find(c => c.id === budget.categoryId);
      if (!cat) continue;
      catName = cat.name;
      catIcon = cat.icon;

      spent = txs
        .filter(t => t.type === 'expense')
        .filter(t => {
          if (t.categoryId === budget.categoryId) return true;
          const txCat = categories.find(c => c.id === t.categoryId);
          return txCat?.parentId === budget.categoryId;
        })
        .reduce((s, t) => s + t.amount, 0);
    }

    const percentage = Math.round((spent / budget.amount) * 100);
    const remaining = budget.amount - spent;

    if (percentage >= 100) {
      alerts.push({
        categoryId: isTotal ? undefined : budget.categoryId,
        categoryName: catName,
        categoryIcon: catIcon,
        level: 'danger',
        budget: budget.amount,
        spent,
        remaining,
        percentage,
      });
    } else if (percentage >= 80) {
      alerts.push({
        categoryId: isTotal ? undefined : budget.categoryId,
        categoryName: catName,
        categoryIcon: catIcon,
        level: 'warning',
        budget: budget.amount,
        spent,
        remaining,
        percentage,
      });
    }
  }

  return alerts;
}, [budgets, currentMonth, adapter]);
```

更新 return 语句，添加 `checkAlerts`：

```ts
return { budgets, loading, getBudget, setBudget, removeBudget, calculateProgress, checkAlerts, reload: load };
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useBudget.ts
git commit -m "feat: add checkAlerts method to useBudget"
```

---

### Task 7: useBudget 测试 — checkAlerts

**Files:**
- Modify: `src/hooks/__tests__/useBudget.test.ts`

- [ ] **Step 1: 添加 checkAlerts 测试用例**

在文件末尾 `});` 之前追加：

```ts
describe('checkAlerts', () => {
  const categories = [
    { id: 'cat_food', name: '餐饮', type: 'expense' as const, icon: '🍜', order: 1 },
    { id: 'cat_transport', name: '交通', type: 'expense' as const, icon: '🚗', order: 2 },
    { id: 'cat_sub_takeout', name: '外卖', type: 'expense' as const, icon: '🥡', order: 1, parentId: 'cat_food' },
  ];

  it('总预算超过100%返回 danger 级别', async () => {
    (adapter.getAllBudgets as any).mockResolvedValue([
      { id: 'b1', categoryId: '__total__', month: '2026-06', amount: 100000 },
    ]);
    (adapter.getTransactionsByMonth as any).mockResolvedValue([
      { id: '1', type: 'expense', amount: 95000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-06-15', createdAt: 1 },
      { id: '2', type: 'expense', amount: 10000, categoryId: 'cat_transport', paymentMethod: 'cash', date: '2026-06-16', createdAt: 2 },
    ]);

    const { result } = renderHook(() => useBudget('2026-06', adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const alerts = await result.current.checkAlerts(categories);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('danger');
    expect(alerts[0].categoryId).toBeUndefined();
    expect(alerts[0].categoryName).toBe('月度总预算');
    expect(alerts[0].percentage).toBe(105);
  });

  it('总预算超过80%但未满100%返回 warning 级别', async () => {
    (adapter.getAllBudgets as any).mockResolvedValue([
      { id: 'b1', categoryId: '__total__', month: '2026-06', amount: 100000 },
    ]);
    (adapter.getTransactionsByMonth as any).mockResolvedValue([
      { id: '1', type: 'expense', amount: 85000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-06-15', createdAt: 1 },
    ]);

    const { result } = renderHook(() => useBudget('2026-06', adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const alerts = await result.current.checkAlerts(categories);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('warning');
    expect(alerts[0].percentage).toBe(85);
  });

  it('分类预算包含子分类支出后超支', async () => {
    (adapter.getAllBudgets as any).mockResolvedValue([
      { id: 'b2', categoryId: 'cat_food', month: '2026-06', amount: 50000 },
    ]);
    (adapter.getTransactionsByMonth as any).mockResolvedValue([
      { id: '1', type: 'expense', amount: 30000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-06-15', createdAt: 1 },
      { id: '2', type: 'expense', amount: 25000, categoryId: 'cat_sub_takeout', paymentMethod: 'wechat', date: '2026-06-16', createdAt: 2 },
    ]);

    const { result } = renderHook(() => useBudget('2026-06', adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const alerts = await result.current.checkAlerts(categories);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('danger');
    expect(alerts[0].categoryId).toBe('cat_food');
    expect(alerts[0].categoryName).toBe('餐饮');
    expect(alerts[0].percentage).toBe(110);
  });

  it('低于80%不产生告警', async () => {
    (adapter.getAllBudgets as any).mockResolvedValue([
      { id: 'b1', categoryId: '__total__', month: '2026-06', amount: 100000 },
      { id: 'b2', categoryId: 'cat_food', month: '2026-06', amount: 50000 },
    ]);
    (adapter.getTransactionsByMonth as any).mockResolvedValue([
      { id: '1', type: 'expense', amount: 30000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-06-15', createdAt: 1 },
    ]);

    const { result } = renderHook(() => useBudget('2026-06', adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const alerts = await result.current.checkAlerts(categories);
    expect(alerts).toHaveLength(0);
  });

  it('多个预算同时超阈值返回多条告警', async () => {
    (adapter.getAllBudgets as any).mockResolvedValue([
      { id: 'b1', categoryId: '__total__', month: '2026-06', amount: 100000 },
      { id: 'b2', categoryId: 'cat_food', month: '2026-06', amount: 50000 },
    ]);
    (adapter.getTransactionsByMonth as any).mockResolvedValue([
      { id: '1', type: 'expense', amount: 85000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-06-15', createdAt: 1 },
      { id: '2', type: 'expense', amount: 20000, categoryId: 'cat_transport', paymentMethod: 'cash', date: '2026-06-16', createdAt: 2 },
    ]);

    const { result } = renderHook(() => useBudget('2026-06', adapter));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const alerts = await result.current.checkAlerts(categories);
    expect(alerts).toHaveLength(2);
  });
});
```

- [ ] **Step 2: 运行测试确认新增用例通过**

```bash
npx vitest run src/hooks/__tests__/useBudget.test.ts
```
Expected: 5 new tests pass

- [ ] **Step 3: Commit**

```bash
git add src/hooks/__tests__/useBudget.test.ts
git commit -m "test: add checkAlerts test cases"
```

---

### Task 8: AddRecord 保存后触发预算告警

**Files:**
- Modify: `src/pages/AddRecord.tsx`

- [ ] **Step 1: 集成 useBudget.checkAlerts + showToast**

更新 imports 块：
```ts
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AmountInput from '../components/AmountInput';
import CategoryPicker from '../components/CategoryPicker';
import PaymentPicker from '../components/PaymentPicker';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useBudget } from '../hooks/useBudget';
import { parseAmountToCents, getToday, formatAmount } from '../utils/format';
import { showToast } from '../utils/toast';
import type { PaymentMethod } from '../models';
```

更新 hooks 调用，从 useCategories 解构 `categories`，新增 useBudget：
```ts
const { expenseCategories, incomeCategories, loading: catLoading, error: catError, getSubs, categories } = useCategories();
const { add } = useTransactions();
const { checkAlerts } = useBudget();
```

修改 handleSave，在 `setNote('');` 后、`setTimeout(() => navigate('/records'), 300);` 前插入：
```ts
      // 预算超支检查（保存后、跳转前）
      try {
        const alerts = await checkAlerts(categories);
        for (const alert of alerts) {
          if (alert.level === 'danger') {
            showToast(`🔴 「${alert.categoryName}」已超支 ${formatAmount(Math.abs(alert.remaining))}`, 'danger');
          } else {
            showToast(`⚠️ 「${alert.categoryName}」预算已用 ${alert.percentage}%，剩 ${formatAmount(alert.remaining)}`, 'warning');
          }
        }
      } catch {
        // 预算检查失败不影响主流程
      }
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AddRecord.tsx
git commit -m "feat: trigger budget alerts after saving in AddRecord"
```

---

### Task 9: Records 编辑保存后触发预算告警

**Files:**
- Modify: `src/pages/Records.tsx`

- [ ] **Step 1: 集成 checkAlerts + showToast**

在 imports 中添加：
```ts
import { useBudget } from '../hooks/useBudget';
import { showToast } from '../utils/toast';
```

在组件内添加：
```ts
const { checkAlerts } = useBudget();
```

修改 `handleSaveEdit`，在 `setEditing(null);` 后添加预算检查：

```ts
const handleSaveEdit = async () => {
  if (!editing) return;
  const amountYuan = parseFloat(editing.amount);
  if (isNaN(amountYuan) || amountYuan <= 0) {
    setEditError('请输入有效金额');
    return;
  }
  if (!editing.categoryId) {
    setEditError('请选择分类');
    return;
  }
  setEditError('');
  await update(editing.id, {
    type: editing.type,
    amount: Math.round(amountYuan * 100),
    categoryId: editing.categoryId,
    paymentMethod: editing.paymentMethod,
    date: editing.date,
    note: editing.note || undefined,
  });
  setEditing(null);

  // 预算超支检查（只对支出类编辑做检查）
  if (editing.type === 'expense') {
    try {
      const alerts = await checkAlerts(categories);
      for (const alert of alerts) {
        if (alert.level === 'danger') {
          showToast(`🔴 「${alert.categoryName}」已超支 ${formatAmount(Math.abs(alert.remaining))}`, 'danger');
        } else {
          showToast(`⚠️ 「${alert.categoryName}」预算已用 ${alert.percentage}%，剩 ${formatAmount(alert.remaining)}`, 'warning');
        }
      }
    } catch {
      // 预算检查失败不影响主流程
    }
  }
};
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Records.tsx
git commit -m "feat: trigger budget alerts after editing in Records"
```

---

### Task 10: Dashboard 顶部预警汇总条

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: 添加告警汇总 banner**

在 imports 中添加 `useEffect, useState` 和 `BudgetAlert` type（如果还没导入），以及还需要 `useMemo`:

Dashboard 已有 `useState` 和 `useEffect`。需要新增一个 state 来存储 alerts：

```ts
import type { BudgetAlert } from '../models';
```

在组件内添加 state 和 effect：

```ts
const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);

useEffect(() => {
  checkAlerts(categories).then(setBudgetAlerts).catch(() => {});
}, [checkAlerts, categories, transactions]);
```

Wait — Dashboard 当前使用 `useBudget()` 但没有解构 `checkAlerts`。需要加上。但 Dashboard 里 `useBudget()` 调用是解构的 `{ budgets, calculateProgress }`，需要加上 `checkAlerts`。

同样 `useCategories()` 当前解构了 `{ getById, categories }`，categories 已经有了。

在三卡片下方（`</div>` 关闭标签后，`本周概览` 之前）插入预警 banner：

```tsx
{budgetAlerts.length > 0 && (
  <div className={`rounded-xl p-4 mb-4 ${
    budgetAlerts.some(a => a.level === 'danger')
      ? 'bg-red-50 border border-red-200'
      : 'bg-amber-50 border border-amber-200'
  }`}>
    <p className={`text-sm font-medium mb-2 ${
      budgetAlerts.some(a => a.level === 'danger') ? 'text-red-700' : 'text-amber-700'
    }`}>
      {budgetAlerts.some(a => a.level === 'danger') ? '🔴 预算超支提醒' : '⚠️ 预算预警'}
    </p>
    {budgetAlerts.map(a => (
      <p key={a.categoryId ?? '__total__'} className={`text-xs mt-1 ${
        a.level === 'danger' ? 'text-red-600' : 'text-amber-600'
      }`}>
        {a.categoryIcon} {a.categoryName}：
        {a.level === 'danger'
          ? `已超支 ${formatAmount(Math.abs(a.remaining))}`
          : `已用 ${a.percentage}%，剩 ${formatAmount(a.remaining)}`}
      </p>
    ))}
  </div>
)}
```

同时更新 useBudget 解构：
```ts
const { budgets, calculateProgress, checkAlerts } = useBudget();
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add budget alert summary banner to Dashboard"
```

---

### Task 11: 最终验证

- [ ] **Step 1: 运行全部测试**

```bash
npx vitest run
```
Expected: 91 tests pass (原有 86 + 新增 5)

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit
```
Expected: clean compilation

- [ ] **Step 3: 启动开发服务器手动验证**

```bash
npm run dev
```

手动测试场景：
1. 设月度总预算 10000，记一笔支出 8500 → 应弹出黄色 Toast "月度总预算已用 85%"
2. 再记一笔 2000 → 应弹出红色 Toast "月度总预算已超支 ¥500"
3. 设分类预算「餐饮」1000，记一笔餐饮支出 1200 → 应弹出红色 Toast "餐饮已超支 ¥200"
4. 去 Dashboard → 顶部应有红色预警条
5. 在 Records 编辑一笔支出，增加金额后保存 → 应触发相应告警
