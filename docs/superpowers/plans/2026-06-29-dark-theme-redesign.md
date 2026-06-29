# 暗夜金融 — 全局 UI 重设计实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将记账 PWA 从浅色基础风格升级为"暗夜金融"暗色主题，覆盖所有 7 个页面 + 11 个共享组件。

**Architecture:** 先改 foundation（tailwind config + CSS tokens），再改 Layout 框架，然后按页面使用频率从高到低逐个改造。每个页面只替换 Tailwind 类名，不动任何逻辑代码。

**Tech Stack:** React 18 + TypeScript + TailwindCSS 3 + Vite

**策略:** 通过 Tailwind `extend.colors` 将现有 token 名（paper/ink/border/expense/income）直接映射到暗色值，使引用旧 token 的代码自动适配。再逐页替换直接使用 Tailwind 原生色值（bg-white, text-gray-* 等）的类名。

---

### Task 1: Foundation — Tailwind Config + CSS

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: 更新 tailwind.config.js — 重映射旧 token + 新增暗色 token**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- 新暗色主题 tokens ---
        'bg-root': '#0a0e14',
        'bg-surface': 'rgba(30, 41, 59, 0.55)',
        'border-subtle': 'rgba(71, 85, 105, 0.25)',
        'border-default': 'rgba(71, 85, 105, 0.35)',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        'accent': '#38bdf8',
        'accent-strong': '#0284c7',

        // --- 旧 token 重映射（渐进兼容，后续逐步移除） ---
        'paper': '#0a0e14',              // 原 #faf9f7 → 暗底
        'ink': '#e2e8f0',                // 原 #1b1b1b → 浅色字
        'border': 'rgba(71, 85, 105, 0.25)', // 原 #e8e4dd → 暗色边框
        'expense': '#f87171',            // 原 #dc2626 → 暖红
        'income': '#34d399',             // 原 #059669 → 翠绿
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
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.25s ease-out',
        'slide-out': 'slide-out 0.25s ease-in forwards',
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: 更新 src/index.css — 新增暗色全局样式和组件类**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  -webkit-tap-highlight-color: transparent;
  background-color: #0a0e14;
  color: #e2e8f0;
}

/* 暗色滚动条（Webkit） */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.4); border-radius: 3px; }

@layer components {
  /* 玻璃质感卡片（替代原 .card） */
  .card {
    @apply rounded-2xl border border-[rgba(71,85,105,0.25)];
    background: rgba(30, 41, 59, 0.55);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  /* 暗色输入框基础样式 */
  .input-dark {
    @apply px-4 py-2.5 rounded-xl border text-sm text-text-primary focus:outline-none transition-colors;
    background: rgba(30, 41, 59, 0.4);
    border-color: rgba(71, 85, 105, 0.35);
  }
  .input-dark:focus {
    border-color: #38bdf8;
  }

  /* 主操作按钮 */
  .btn-primary {
    @apply w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition-all;
    background: linear-gradient(135deg, #0284c7, #0ea5e9);
    box-shadow: 0 4px 20px rgba(2, 132, 199, 0.25);
  }
  .btn-primary:active {
    transform: scale(0.98);
  }

  /* 次按钮 */
  .btn-secondary {
    @apply py-2.5 rounded-xl border text-sm font-medium transition-colors text-center;
    border-color: rgba(71, 85, 105, 0.35);
    color: #38bdf8;
    background: transparent;
  }
  .btn-secondary:hover {
    background: rgba(56, 189, 248, 0.08);
  }

  /* 暗色 select 基础样式 */
  .select-dark {
    @apply px-2.5 py-1.5 rounded-xl border text-sm transition-colors;
    background: rgba(30, 41, 59, 0.5);
    border-color: rgba(71, 85, 105, 0.35);
    color: #e2e8f0;
  }
}

@layer utilities {
  .text-gradient-positive {
    background: linear-gradient(135deg, #34d399 0%, #2dd4bf 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .text-gradient-negative {
    background: linear-gradient(135deg, #f87171 0%, #fb923c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .text-gradient-neutral {
    background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}
```

- [ ] **Step 3: 验证 foundation 生效**

Run: `npm run dev`，打开浏览器确认页面背景已变暗（即使样式还有问题，body 背景应为 #0a0e14）。

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js src/index.css
git commit -m "feat: dark theme foundation — tailwind tokens + CSS components"
```

---

### Task 2: Layout — 底部导航栏 + 页面框架

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: 重写 Layout.tsx 全部类名**

将文件完整替换为：

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
    <div className="min-h-screen pb-16 bg-bg-root">
      <ToastContainer />
      <main className="max-w-lg mx-auto">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(71,85,105,0.15)]"
        style={{
          background: 'rgba(10, 14, 20, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-lg mx-auto flex justify-around">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 text-[10px] transition-colors ${
                  isActive ? 'text-accent font-semibold' : 'text-slate-600 font-medium'
                }`
              }
            >
              <span className="text-lg mb-0.5">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: 验证**

Run: `npm run dev`，确认底部导航栏已变为暗色毛玻璃效果，选中态为青色。

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: dark theme bottom nav with glass effect"
```

---

### Task 3: Shared Components — 通用组件暗色适配

**Files:**
- Modify: `src/components/EmptyState.tsx`
- Modify: `src/components/ConfirmDialog.tsx`
- Modify: `src/components/Toast.tsx`
- Modify: `src/components/AmountInput.tsx`
- Modify: `src/components/CategoryPicker.tsx`
- Modify: `src/components/PaymentPicker.tsx`
- Modify: `src/components/CategoryForm.tsx`
- Modify: `src/components/TemplatePicker.tsx`
- Modify: `src/components/Charts.tsx`
- Modify: `src/components/BudgetHistory.tsx`

- [ ] **Step 1: EmptyState.tsx**

```tsx
interface Props {
  icon?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = '📭', message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <span className="text-5xl">{icon}</span>
      <p className="mt-3 text-sm text-slate-400">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{
            background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
            boxShadow: '0 4px 16px rgba(2, 132, 199, 0.2)',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: ConfirmDialog.tsx**

```tsx
interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = '确认删除' }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="rounded-2xl p-6 mx-4 max-w-sm w-full border border-[rgba(71,85,105,0.3)]"
        style={{ background: 'rgba(20, 30, 44, 0.95)', backdropFilter: 'blur(20px)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-slate-400 mt-2">{message}</p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-[rgba(71,85,105,0.35)] text-slate-300 text-sm"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Toast.tsx**

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
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto cursor-pointer border ${
            toast.type === 'danger'
              ? 'bg-red-500/90 text-white border-red-400/30'
              : 'bg-amber-500/90 text-white border-amber-400/30'
          } ${toast.exiting ? 'animate-slide-out' : 'animate-slide-in'}`}
          style={{ backdropFilter: 'blur(8px)' }}
          onClick={() => dismiss(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: AmountInput.tsx**

```tsx
import { useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function AmountInput({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="py-6 text-center">
      <div
        className="text-5xl font-bold text-text-primary tabular-nums flex items-center justify-center tracking-tight"
        onClick={() => inputRef.current?.focus()}
      >
        <span className={value ? '' : 'text-slate-600'}>
          {value || '0'}
        </span>
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className="opacity-0 absolute"
        value={value}
        onChange={e => {
          const v = e.target.value;
          if (/^\d*\.?\d{0,2}$/.test(v) || v === '') {
            onChange(v);
          }
        }}
        autoFocus
      />
      <p className="text-xs text-slate-500 mt-2">点击金额输入</p>
    </div>
  );
}
```

- [ ] **Step 5: CategoryPicker.tsx**

```tsx
import type { Category } from '../models';

interface Props {
  type: 'expense' | 'income';
  categories: Category[];
  subCategories: Category[];
  selectedCategoryId: string;
  selectedSubCategoryId?: string;
  onCategoryChange: (id: string) => void;
  onSubCategoryChange?: (id: string) => void;
}

export default function CategoryPicker({
  type, categories, subCategories,
  selectedCategoryId, selectedSubCategoryId,
  onCategoryChange, onSubCategoryChange,
}: Props) {
  const topCategories = categories.filter(c => c.type === type && !c.parentId);

  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2">
        {type === 'expense' ? '支出分类' : '收入分类'}
      </label>
      <div className="grid grid-cols-4 gap-3">
        {topCategories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategoryChange(cat.id)}
            className={`flex flex-col items-center py-3 px-1 rounded-xl border transition-all overflow-hidden ${
              selectedCategoryId === cat.id
                ? 'border-accent bg-sky-950/30'
                : 'border-[rgba(71,85,105,0.25)] bg-[rgba(30,41,59,0.35)]'
            }`}
          >
            {cat.color && (
              <div
                className="w-full h-1 -mt-3 mb-2"
                style={{ backgroundColor: cat.color }}
              />
            )}
            <span className="text-2xl">{cat.icon}</span>
            <span className="text-xs mt-1 text-slate-300">{cat.name}</span>
          </button>
        ))}
      </div>

      {subCategories.length > 0 && onSubCategoryChange && (
        <div className="mt-3 flex flex-wrap gap-2">
          {subCategories.map(sub => (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSubCategoryChange(sub.id)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                selectedSubCategoryId === sub.id
                  ? 'bg-accent text-white border-accent'
                  : 'bg-[rgba(30,41,59,0.35)] text-slate-400 border-[rgba(71,85,105,0.25)]'
              }`}
            >
              {sub.icon} {sub.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: PaymentPicker.tsx**

```tsx
import { PAYMENT_METHODS, type PaymentMethod } from '../models';

interface Props {
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
}

export default function PaymentPicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2">支付方式</label>
      <div className="flex flex-wrap gap-2">
        {PAYMENT_METHODS.map(pm => (
          <button
            key={pm.value}
            type="button"
            onClick={() => onChange(pm.value)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              value === pm.value
                ? 'bg-accent text-white border-accent'
                : 'bg-[rgba(30,41,59,0.35)] text-slate-400 border-[rgba(71,85,105,0.35)]'
            }`}
          >
            {pm.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: CategoryForm.tsx** — 只替换类名，保持逻辑完全不变（代码以 Edit 方式修改）

将所有 `bg-white` → `bg-[rgba(30,41,59,0.4)]`，`text-ink` → `text-text-primary`，
`text-gray-400` → `text-slate-400`，`text-gray-500` → `text-slate-300`，
`border-border` → `border-border-subtle`，`bg-blue-50` → `bg-sky-950/30`，
`border-blue-400` → `border-accent`，`bg-blue-500` → 渐变按钮样式，
`bg-[#faf9f7]` → `bg-[rgba(20,30,44,0.5)]`，`bg-[#f0ece6]` → `bg-[rgba(20,30,44,0.6)]`，
`bg-gray-300` → `bg-slate-700/50`，`focus:border-blue-400` → `focus:border-accent`，
`text-red-500` → `text-red-400`。

- [ ] **Step 8: TemplatePicker.tsx** — 关键类名替换

将 `bg-white` → `bg-[rgba(15,25,38,0.98)]`，`bg-gray-50` → `bg-[rgba(30,41,59,0.4)]`，
`hover:bg-blue-50` → `hover:bg-sky-950/30`，`active:bg-blue-100` → `active:bg-sky-900/40`，
`border-gray-100` → `border-[rgba(71,85,105,0.2)]`，
`text-ink` → `text-text-primary`，`text-gray-400` → `text-slate-400`，
`text-gray-600` → `text-slate-300`，
`bg-black/30` → `bg-black/50`，
`text-expense` / `text-income` / `bg-red-50` / `bg-green-50` → 保持，旧 token 已映射。

- [ ] **Step 9: Charts.tsx** — Recharts 暗色适配

关键改动：
- 卡片 `.card` 类由旧 token 映射自动适配
- `text-ink` → `text-text-primary`（自动）
- `text-gray-800` → `text-slate-200`
- `text-gray-400` → `text-slate-400`
- `text-gray-500` → `text-slate-400`
- `bg-[#faf9f6]` → `bg-[rgba(30,41,59,0.4)]`
- `border-gray-100` → `border-[rgba(71,85,105,0.2)]`
- `border-gray-50` → `border-[rgba(71,85,105,0.15)]`
- `text-blue-500` → `text-accent`
- `text-expense` → 旧 token 已映射
- CartesianGrid stroke: `#f0f0f0` → `rgba(71,85,105,0.2)`
- PieChart Tooltip: 保持

- [ ] **Step 10: BudgetHistory.tsx** — 关键类名替换

将 `text-ink` → 自动映射，`text-gray-400` → `text-slate-400`，`text-gray-500` → `text-slate-400`，
`text-gray-300` → `text-slate-600`，`bg-white` → `bg-[rgba(30,41,59,0.4)]`，
`border-border` → 自动映射，`bg-blue-500` → 渐变，`bg-gray-100` → `bg-[rgba(30,41,59,0.4)]`，
`text-blue-500` → `text-accent`，`hover:bg-blue-50` → `hover:bg-sky-950/30`，
`border-gray-100` → `border-[rgba(71,85,105,0.2)]`，`border-gray-50` → `border-[rgba(71,85,105,0.15)]`，
CartesianGrid stroke: `#f0f0f0` → `rgba(71,85,105,0.2)`。

rateColor 函数中的 Tailwind 颜色类也需更新：
```tsx
function rateColor(rate: number): string {
  if (rate >= 100) return 'text-red-400';
  if (rate >= 80) return 'text-amber-400';
  return 'text-emerald-400';
}
```

- [ ] **Step 11: 验证组件**

Run: `npm run dev`，逐页检查各组件显示正常。

- [ ] **Step 12: Commit**

```bash
git add src/components/
git commit -m "feat: dark theme shared components"
```

---

### Task 4: Dashboard 概览页

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: 重写 Dashboard.tsx**

完整替换文件内容。关键类名映射：
- `px-4 py-8` → `px-5 pt-7 pb-8`
- `text-xl font-bold text-ink` → `text-[26px] font-bold text-text-primary tracking-tight`
- 统计卡片：`card p-3 text-center` → `card p-4 text-center`（card 类自动变玻璃）
- 卡片标签：`text-xs text-gray-400` → `text-[10.5px] text-slate-500 uppercase tracking-wider font-medium`
- 金额数字：`text-lg font-bold text-expense tabular-nums` → `text-[22px] font-bold text-expense tabular-nums`
- 预算进度条：`h-2.5 bg-gray-100` → `h-1.5 bg-[rgba(71,85,105,0.25)]`
- 进度条填充：`bg-expense / bg-yellow-500 / bg-blue-500` → gradient accent
- 按钮：`bg-blue-500 text-white rounded-xl` → `btn-primary`
- 异常提醒：`bg-yellow-50 border border-yellow-200` → `bg-yellow-950/20 border border-yellow-800/40`
- 备份提醒：`bg-blue-50 border border-blue-200` → `bg-sky-950/30 border border-sky-800/40`
- 预算超支：`bg-red-50 border-red-200` / `bg-amber-50 border-amber-200` → 对应暗色
- 月份标签：右上角 `bg-[rgba(71,85,105,0.2)]` pill
- 分类预算进度条：颜色点保持原分类色，进度条 4px 高
- 周概览竖线分隔：`bg-[rgba(71,85,105,0.2)]`

完整代码参见设计文档中的 Dashboard mockup，将其转为 Tailwind 类名。

- [ ] **Step 2: 验证**

Run: `npm run dev`，检查概览页与设计预览一致。

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: dark theme Dashboard"
```

---

### Task 5: AddRecord 记账页

**Files:**
- Modify: `src/pages/AddRecord.tsx`

- [ ] **Step 1: 重写 AddRecord.tsx**

关键改动：
- 支出/收入 Tab：`bg-[#f0ece6]` → `bg-[rgba(20,30,44,0.6)]`，选中 `bg-white text-ink shadow-sm` → `bg-[rgba(30,41,59,0.8)] text-text-primary border border-accent/30`
- 日期/备注输入框：统一 `.input-dark` 样式（或内联等价类）
- 标签文字：`text-gray-400` → `text-slate-400`
- 模板/保存模板按钮：`border-blue-200 text-blue-500` → 次按钮样式
- 保存按钮：`bg-blue-500` → `btn-primary`
- 弹窗：`bg-white` → 暗色 glass，`bg-black/30` → `bg-black/50`

- [ ] **Step 2: 验证**

Run: `npm run dev`，验证记账表单各项显示正确。

- [ ] **Step 3: Commit**

```bash
git add src/pages/AddRecord.tsx
git commit -m "feat: dark theme AddRecord"
```

---

### Task 6: Records 流水页

**Files:**
- Modify: `src/pages/Records.tsx`

- [ ] **Step 1: 重写 Records.tsx**

关键改动：
- 标题行：`text-xl font-bold text-ink` → `text-[26px] font-bold text-text-primary tracking-tight`
- 搜索按钮：`text-gray-400 hover:text-ink` → `text-slate-500 hover:text-slate-200`
- Select 下拉框：统一 `.select-dark` 样式（`bg-[rgba(30,41,59,0.5)] border-[rgba(71,85,105,0.35)] text-text-primary`）
- 汇总栏：`text-gray-500` → `text-slate-400`，`text-expense`/`text-income` 自动映射
- 日期标题：`text-sm font-semibold text-ink` → `text-sm font-semibold text-slate-200`
- 记录卡片：`.card` 自动变玻璃
- 分类名：`text-sm text-ink` → `text-sm text-slate-200`
- 备注：`text-xs text-gray-400` → `text-xs text-slate-500`
- 支付方式标签：`text-[10px] text-gray-400` → `text-[10px] text-slate-500`
- 编辑/删除按钮：`opacity-40 hover:opacity-80` → `opacity-50 hover:opacity-100 text-slate-400`
- 搜索模式输入框：`border-blue-300 bg-blue-50` → `border-accent/50 bg-sky-950/20`
- 编辑面板：`bg-blue-50/50 border-blue-200` → `bg-sky-950/20 border-accent/30`
- 加载/空状态：自动适配（EmptyState 已改）
- 编辑表单内选项按钮：`bg-gray-100` → `bg-[rgba(20,30,44,0.6)]`，选中 `bg-white shadow-sm` → `bg-[rgba(30,41,59,0.8)]`

- [ ] **Step 2: 验证**

Run: `npm run dev`，查看流水页、筛选、搜索、编辑模式均正常。

- [ ] **Step 3: Commit**

```bash
git add src/pages/Records.tsx
git commit -m "feat: dark theme Records"
```

---

### Task 7: Calendar 日历页

**Files:**
- Modify: `src/pages/Calendar.tsx`

- [ ] **Step 1: 重写 Calendar.tsx**

关键改动：
- 标题：同上
- Select 下拉框：`.select-dark`
- 月度摘要卡片：`.card` 自动适配，`text-ink` / `text-gray-400` → 暗色映射
- 分隔线：`bg-border` → 自动映射
- 星期头：`text-gray-300` → `text-slate-600`
- 非当月格：`bg-[#f0ede7]` → `bg-[rgba(20,28,38,0.4)]`，`hover:bg-[#ebe7e0]` → `hover:bg-[rgba(30,41,59,0.5)]`
- 热力图背景:
  ```tsx
  const HEAT_BG: Record<number, string> = {
    0: 'bg-[rgba(30,41,59,0.3)] border border-[rgba(71,85,105,0.2)]',
    1: 'bg-red-950/30',
    2: 'bg-red-950/50',
    3: 'bg-red-900/50',
    4: 'bg-red-800/50',
  };
  ```
- 热力图文字:
  ```tsx
  const HEAT_TEXT: Record<number, string> = {
    0: 'text-slate-400',
    1: 'text-red-300',
    2: 'text-red-300',
    3: 'text-red-200',
    4: 'text-red-100',
  };
  ```
- 选中态：`ring-blue-400` → `ring-accent`
- 今日标记：`ring-blue-400` → `ring-accent`
- 详情面板：`bg-white border-border` → `.card`
- 拖拽指示条：`bg-gray-300` → `bg-slate-600`
- 色阶图例：渐变 `from-[#f0ede7] via-red-200 to-red-300` → `from-[rgba(30,41,59,0.3)] via-red-950/40 to-red-800/50`

- [ ] **Step 2: 验证**

Run: `npm run dev`，检查日历热力图在暗色下辨识度正常。

- [ ] **Step 3: Commit**

```bash
git add src/pages/Calendar.tsx
git commit -m "feat: dark theme Calendar"
```

---

### Task 8: Reports 报表页

**Files:**
- Modify: `src/pages/Reports.tsx`

- [ ] **Step 1: 重写 Reports.tsx**

关键改动：
- 标题行：同上
- Select 下拉框：`.select-dark`
- 月度收支汇总卡片：`.card` 自动适配
- `text-gray-400` → `text-slate-500`，`text-expense`/`text-income` → 自动映射
- `text-green-500` → `text-emerald-400`，`text-red-400` → `text-red-400`
- 异常预警卡片：`bg-white` → `.card`，`text-gray-800` → `text-slate-200`，`border-gray-50` → `border-[rgba(71,85,105,0.15)]`
- 加载中：`text-gray-400` → `text-slate-500`

- [ ] **Step 2: 验证**

Run: `npm run dev`，验证报表页图表和数据显示正常。

- [ ] **Step 3: Commit**

```bash
git add src/pages/Reports.tsx
git commit -m "feat: dark theme Reports"
```

---

### Task 9: Budget + Settings 页

**Files:**
- Modify: `src/pages/Budget.tsx`
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: 重写 Budget.tsx**

关键改动：
- 标题：`text-xl font-bold text-ink` → `text-[26px] font-bold text-text-primary tracking-tight`
- 卡片标题：`text-sm font-semibold text-ink` → `text-sm font-semibold text-slate-200`
- 输入框：`.input-dark`
- 保存按钮：`bg-blue-500 text-white` → 渐变按钮（小号版）
- 分类图标/名称：`text-ink` → `text-slate-200`
- 加载中：`text-gray-400` → `text-slate-500`

- [ ] **Step 2: 重写 Settings.tsx**

关键改动：
- 标题：同上
- 卡片标题：同上
- 链接项文字：`text-gray-800` → `text-slate-200`
- 箭头：`text-gray-400` → `text-slate-500`
- 分类行文字：`text-ink` → `text-slate-200`，`text-gray-500` → `text-slate-400`
- 操作按钮：颜色保持（蓝色编辑、红色删除、绿色新增）
- 导出/导入按钮：主按钮渐变 + 次按钮暗色
- CSV 按钮：`bg-white border-gray-200 text-gray-700` → `bg-transparent border-[rgba(71,85,105,0.35)] text-slate-300`
- 模板管理：`text-ink` → `text-slate-200`，`text-gray-400` → `text-slate-500`
- 模板类别标签：`bg-red-50 text-red-400` → `bg-red-950/30 text-red-400`，`bg-green-50 text-green-500` → `bg-emerald-950/30 text-emerald-400`
- 分隔线：`border-gray-50` → `border-[rgba(71,85,105,0.15)]`
- 关于文字：`text-gray-400` → `text-slate-500`

- [ ] **Step 3: 验证**

Run: `npm run dev`，检查预算设置和设置页所有功能正常。

- [ ] **Step 4: Commit**

```bash
git add src/pages/Budget.tsx src/pages/Settings.tsx
git commit -m "feat: dark theme Budget + Settings"
```

---

### Task 10: 全局收尾 — 验证 + 微调

- [ ] **Step 1: 全局检查**

Run: `npm run dev`，逐页检查 7 个页面的：
1. 文字是否可读（text-primary 在暗底上的对比度）
2. 卡片是否显示玻璃质感（backdrop-filter 效果）
3. 输入框边框和聚焦态是否正常
4. 按钮风格是否统一
5. 异常/警告/超支的颜色在暗色下是否仍有区分度
6. Recharts 图表是否可读（网格线、tooltip）

- [ ] **Step 2: 问题修复**

记录并修复发现的视觉问题。

- [ ] **Step 3: TypeScript 编译检查**

```bash
npx tsc --noEmit
```

确保无类型错误。

- [ ] **Step 4: 构建验证**

```bash
npm run build
```

确保 Vite 构建成功，无 CSS 或 JS 错误。

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: dark theme polish and final adjustments"
```
