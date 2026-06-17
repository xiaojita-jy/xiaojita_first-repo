# 日历视图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增日历视图页面，iOS 风格月历展示每日收支汇总，点击日期跳转流水页筛选。

**Architecture:** 在 `format.ts` 新增 `getCalendarDays` 工具函数生成日历网格；新建 `Calendar.tsx` 页面使用 `useTransactions` 获取全部流水并计算每日期汇总；`Records.tsx` 通过 URL 参数 `?date=` 支持按日筛选。

**Tech Stack:** React 18 + TypeScript + React Router v6 + TailwindCSS 3 + Vitest

---

## 文件结构

| 文件 | 职责 | 变更类型 |
|------|------|----------|
| `src/utils/format.ts` | 新增 `getCalendarDays`，生成月历网格数据 | 修改 |
| `src/utils/__tests__/format.test.ts` | `getCalendarDays` 单元测试 | 修改 |
| `src/components/Layout.tsx` | tabs 数组增加「日历」项 | 修改 |
| `src/App.tsx` | 新增 `/calendar` 路由 + lazy import | 修改 |
| `src/pages/Calendar.tsx` | 日历页面主体 | 新建 |
| `src/pages/Records.tsx` | 支持 `?date=` 查询参数按日筛选 | 修改 |

---

### Task 1: 新增 `getCalendarDays` 工具函数 + 测试

**Files:**
- Modify: `src/utils/format.ts`
- Modify: `src/utils/__tests__/format.test.ts`

- [ ] **Step 1: 写测试**

在 `src/utils/__tests__/format.test.ts` 末尾追加：

```typescript
import { getCalendarDays, CalendarDay } from '../format';

describe('getCalendarDays', () => {
  it('2026-06 返回 35 天（5 周，6月1日是周一，无需前置填充）', () => {
    const days = getCalendarDays(2026, 6);
    expect(days).toHaveLength(35);
  });

  it('2026-07 返回 35 天（5 周，7月1日是周三）', () => {
    const days = getCalendarDays(2026, 7);
    expect(days).toHaveLength(35);
  });

  it('2026-03 返回 42 天（6 周，3月1日是周日）', () => {
    const days = getCalendarDays(2026, 3);
    expect(days).toHaveLength(42);
  });

  it('第一天是当月的 1 号', () => {
    const days = getCalendarDays(2026, 6);
    const firstCurrent = days.find(d => d.isCurrentMonth)!;
    expect(firstCurrent.day).toBe(1);
    expect(firstCurrent.date).toBe('2026-06-01');
  });

  it('前置填充日 isCurrentMonth 为 false', () => {
    const days = getCalendarDays(2026, 7); // 7月1日是周三，前2天是6月29、30
    expect(days[0].isCurrentMonth).toBe(false);
    expect(days[1].isCurrentMonth).toBe(false);
    expect(days[2].isCurrentMonth).toBe(true); // 7月1日
  });

  it('后置填充日 isCurrentMonth 为 false', () => {
    const days = getCalendarDays(2026, 6); // 6月30日是周二，后5天是7月1-5日
    const lastFew = days.slice(-5);
    lastFew.forEach(d => expect(d.isCurrentMonth).toBe(false));
  });

  it('跨年：2025-12 前置填充（12月1日是周六→周五前置）', () => {
    const days = getCalendarDays(2025, 12);
    const firstCurrent = days.find(d => d.isCurrentMonth)!;
    expect(firstCurrent.date).toBe('2025-12-01');
    expect(days[0].isCurrentMonth).toBe(false);
  });

  it('跨年：2026-01 日历包含 2025-12 的前置日期', () => {
    const days = getCalendarDays(2026, 1);
    const firstPadding = days[0];
    expect(firstPadding.isCurrentMonth).toBe(false);
    expect(firstPadding.date).toBe('2025-12-29');
  });

  it('每周从周一开始，第一列为周一', () => {
    const days = getCalendarDays(2026, 6);
    // 2026-06-01 是周一，offset=0，第一格就是6月1日
    const monday = new Date(days[0].date);
    expect(monday.getDay()).toBe(1); // 周一
  });

  it('返回的日期字符串格式为 YYYY-MM-DD', () => {
    const days = getCalendarDays(2026, 6);
    days.forEach(d => {
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('isToday 标记今天', () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const days = getCalendarDays(year, month);
    const todayItem = days.find(d => d.date === todayStr);
    expect(todayItem).toBeDefined();
    expect(todayItem!.isToday).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/utils/__tests__/format.test.ts -t "getCalendarDays"
```

预期：全部 FAIL，`getCalendarDays` 未定义

- [ ] **Step 3: 实现 `getCalendarDays` 和 `CalendarDay` 类型**

在 `src/utils/format.ts` 末尾追加：

```typescript
/** 日历格子数据 */
export interface CalendarDay {
  date: string;       // YYYY-MM-DD
  day: number;        // 1-31
  isToday: boolean;
  isCurrentMonth: boolean;
}

/**
 * 生成月历网格（周一始，iOS 风格）
 * @returns 35 或 42 个 CalendarDay（5 或 6 周）
 */
export function getCalendarDays(year: number, month: number): CalendarDay[] {
  const today = getToday();
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // 周一起始偏移：周日(0) → 6，周一(1) → 0，...，周六(6) → 5
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const endOffset = lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1;

  const totalDays = lastDay.getDate();
  const totalCells = startOffset + totalDays + (6 - endOffset);

  const days: CalendarDay[] = [];
  // 起始日期 = 当月1号 - startOffset 天
  const startDate = new Date(year, month - 1, 1 - startOffset);

  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    days.push({
      date: dateStr,
      day: d.getDate(),
      isToday: dateStr === today,
      isCurrentMonth: d.getMonth() === month - 1,
    });
  }

  return days;
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npx vitest run src/utils/__tests__/format.test.ts -t "getCalendarDays"
```

预期：全部 PASS

- [ ] **Step 5: 运行全部测试确保无回归**

```bash
npx vitest run
```

预期：全部 PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/format.ts src/utils/__tests__/format.test.ts
git commit -m "feat: add getCalendarDays utility for monthly calendar grid"
```

---

### Task 2: 新增日历路由和导航 Tab

**Files:**
- Modify: `src/components/Layout.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Layout.tsx — tabs 数组新增日历项**

在 `src/components/Layout.tsx` 的 tabs 数组中，在「记账」和「流水」之间插入：

```typescript
const tabs = [
  { to: '/', label: '概览', icon: '📊' },
  { to: '/add', label: '记账', icon: '➕' },
  { to: '/calendar', label: '日历', icon: '📅' },  // ← 新增
  { to: '/records', label: '流水', icon: '📋' },
  { to: '/reports', label: '报表', icon: '📈' },
  { to: '/settings', label: '我的', icon: '⚙️' },
];
```

- [ ] **Step 2: App.tsx — 新增路由 + lazy import**

在 `src/App.tsx` 中：

```typescript
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const AddRecord = lazy(() => import('./pages/AddRecord'));
const Calendar = lazy(() => import('./pages/Calendar'));  // ← 新增
const Records = lazy(() => import('./pages/Records'));
const Reports = lazy(() => import('./pages/Reports'));
const Budget = lazy(() => import('./pages/Budget'));
const Settings = lazy(() => import('./pages/Settings'));

// ... Loading ...

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* 现有路由... */}
        <Route
          path="calendar"                                                          // ← 新增
          element={                                                                // ← 新增
            <Suspense fallback={<Loading />}>                                      // ← 新增
              <Calendar />                                                         // ← 新增
            </Suspense>                                                            // ← 新增
          }                                                                        // ← 新增
        />                                                                         // ← 新增
        <Route
          path="records"
          element={
            <Suspense fallback={<Loading />}>
              <Records />
            </Suspense>
          }
        />
        {/* 其余路由不变... */}
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 3: 创建 Calendar 页面占位文件**

`src/pages/Calendar.tsx`（先写最小占位，下一任务补充完整）：

```typescript
export default function Calendar() {
  return (
    <div className="px-4 py-8">
      <h1 className="text-xl font-bold text-ink mb-6">日历</h1>
      <p className="text-gray-400 text-sm">日历视图开发中...</p>
    </div>
  );
}
```

- [ ] **Step 4: 验证构建通过**

```bash
npx tsc --noEmit
```

预期：无类型错误

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.tsx src/App.tsx src/pages/Calendar.tsx
git commit -m "feat: add calendar route and nav tab with placeholder page"
```

---

### Task 3: 实现 Calendar 页面主体

**Files:**
- Modify: `src/pages/Calendar.tsx`

- [ ] **Step 1: 完整实现 Calendar 页面**

替换 `src/pages/Calendar.tsx` 为完整实现：

```typescript
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { getCalendarDays, getToday, formatAmount } from '../utils/format';
import type { CalendarDay } from '../utils/format';

const TODAY = getToday();
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function Calendar() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const navigate = useNavigate();

  const { transactions } = useTransactions();

  // 按日期汇总收支
  const dailySummary = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    transactions.forEach(tx => {
      const entry = map.get(tx.date) || { income: 0, expense: 0 };
      if (tx.type === 'income') entry.income += tx.amount;
      else entry.expense += tx.amount;
      map.set(tx.date, entry);
    });
    return map;
  }, [transactions]);

  // 生成日历网格
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  const handleDayClick = (day: CalendarDay) => {
    const summary = dailySummary.get(day.date);
    if (summary && (summary.income > 0 || summary.expense > 0)) {
      navigate(`/records?date=${day.date}`);
    }
  };

  return (
    <div className="px-4 py-8">
      {/* 标题 + 年份/月份选择 */}
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-xl font-bold text-ink">日历</h1>
        <div className="flex gap-1.5 ml-auto">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg border border-border text-sm bg-white text-ink"
          >
            {YEARS.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg border border-border text-sm bg-white text-ink"
          >
            {MONTHS.map(m => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
        </div>
      </div>

      {/* 星期头 */}
      <div className="grid grid-cols-7 mb-1">
        {['一', '二', '三', '四', '五', '六', '日'].map(w => (
          <div key={w} className="text-center text-xs text-gray-400 py-2">
            {w}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 border-l border-t border-border rounded-lg overflow-hidden">
        {days.map((day, i) => {
          const summary = dailySummary.get(day.date);
          const hasTransactions = summary && (summary.income > 0 || summary.expense > 0);

          return (
            <div
              key={day.date}
              onClick={() => handleDayClick(day)}
              className={`
                border-r border-b border-border
                min-h-[52px] p-1.5 flex flex-col
                ${day.isCurrentMonth ? 'bg-white' : 'bg-[#f8f6f2]'}
                ${day.isToday ? 'ring-1 ring-inset ring-blue-400' : ''}
                ${hasTransactions ? 'cursor-pointer active:bg-blue-50/50' : ''}
                transition-colors
              `}
            >
              {/* 日期数字 */}
              <span className={`
                text-xs self-end
                ${day.isCurrentMonth ? 'text-ink' : 'text-gray-300'}
                ${day.isToday ? 'text-blue-500 font-bold' : ''}
              `}>
                {day.day}
              </span>

              {/* 金额 */}
              {day.isCurrentMonth && summary && (
                <div className="flex-1 flex flex-col justify-center items-center mt-0.5 space-y-0.5">
                  {summary.income > 0 && (
                    <span className="text-income text-[10px] leading-tight font-mono tabular-nums">
                      +{formatAmount(summary.income)}
                    </span>
                  )}
                  {summary.expense > 0 && (
                    <span className="text-expense text-[10px] leading-tight font-mono tabular-nums">
                      -{formatAmount(summary.expense)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证构建和类型**

```bash
npx tsc --noEmit
```

预期：无类型错误

- [ ] **Step 3: Commit**

```bash
git add src/pages/Calendar.tsx
git commit -m "feat: implement Calendar page with iOS-style grid and daily summaries"
```

---

### Task 4: Records 页面支持按日筛选

**Files:**
- Modify: `src/pages/Records.tsx`

- [ ] **Step 1: 添加 useSearchParams 支持，按日筛选模式**

在 `src/pages/Records.tsx` 顶部导入区增加：

```typescript
import { useSearchParams } from 'react-router-dom';
```

在组件开头增加 searchParams 读取（在现有 useState 之前）：

```typescript
const [searchParams, setSearchParams] = useSearchParams();
const filterDate = searchParams.get('date');
```

修改 `useTransactions` 调用，当有 `filterDate` 时传该日期所在月份：

```typescript
// 原: const { transactions, loading, remove, update } = useTransactions(month);
// 改为：
const queryMonth = filterDate ? filterDate.slice(0, 7) : month;
const { transactions, loading, remove, update } = useTransactions(queryMonth);
```

在 `filtered` 计算后，增加按日过滤：

```typescript
const filtered = (() => {
  let result = transactions.filter(tx => {
    if (filterCategories.size > 0) {
      const cat = getById(tx.categoryId);
      const parentId = cat?.parentId ?? tx.categoryId;
      if (!filterCategories.has(tx.categoryId) && !filterCategories.has(parentId)) {
        return false;
      }
    }
    if (filterPayment && tx.paymentMethod !== filterPayment) return false;
    return true;
  });
  // 按日筛选
  if (filterDate) {
    result = result.filter(tx => tx.date === filterDate);
  }
  return result;
})();
```

修改顶部 UI：当月选择区域根据是否有 `filterDate` 切换显示：

```typescript
{/* 标题行 */}
<div className="flex items-center gap-2 mb-5">
  <h1 className="text-xl font-bold text-ink">流水</h1>
  {filterDate ? (
    <div className="flex items-center gap-2 ml-auto">
      <span className="text-sm font-medium text-ink">
        {formatDateShort(filterDate)} {getDayOfWeek(filterDate)}
      </span>
      <button
        onClick={() => setSearchParams({})}
        className="text-xs text-blue-500 cursor-pointer"
      >
        ← 返回整月
      </button>
    </div>
  ) : null}
</div>
```

将现有的筛选控件（月份选择、分类标签、支付方式选择）包裹在条件渲染中：

```typescript
{!filterDate && (
  <div className="flex gap-2 mb-5 flex-wrap">
    {/* 原有的月份下拉、分类标签、支付方式选择 */}
  </div>
)}
```

- [ ] **Step 2: 验证 TypeScript 构建**

```bash
npx tsc --noEmit
```

预期：无类型错误

- [ ] **Step 3: Commit**

```bash
git add src/pages/Records.tsx
git commit -m "feat: support date filtering via ?date= URL param in Records page"
```

---

### Task 5: 集成验证

- [ ] **Step 1: 运行全部测试确认无回归**

```bash
npx vitest run
```

- [ ] **Step 2: 启动开发服务器验证功能**

```bash
npx vite
```

手动验证：
1. 底部导航出现「📅 日历」Tab
2. 日历页默认显示当月，格子显示收支金额
3. 切换年份、月份正常
4. 点击有收支的日期 → 跳转流水页，只显示该日期记录
5. 流水页「返回整月」按钮恢复按月视图
6. 点击无收支的日期无反应

- [ ] **Step 3: 验证 PWA 构建**

```bash
npx vite build
```
