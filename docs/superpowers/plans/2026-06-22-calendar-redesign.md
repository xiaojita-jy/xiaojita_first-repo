# 日历页设计改版 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Calendar.tsx 从纯数据网格改造为热力图风格的消费节奏视图，包含月度摘要条、5档色阶热力图、点击展开分类详情面板。

**Architecture:** 单文件改动为主——`Calendar.tsx` 完全重写。复用现有 `useTransactions`（加载全部交易）、`useCategories`（分类数据）、`getCalendarDays`（日历网格生成）。不需要新增文件或修改 adapter 层。热力图色阶使用已有 Tailwind red-50~red-300，不需要新增颜色 token。

**Tech Stack:** React 18 + TypeScript + TailwindCSS 3 + Dexie.js

---

### Task 1: 热力图色阶计算函数

**Files:**
- Modify: `src/pages/Calendar.tsx` — 新增 `useMemo` 计算逻辑

> 注：ColorUtility 不需要加到 tailwind.config，直接用已有的 `red-50`, `red-100`, `red-200`, `red-300`。

- [ ] **Step 1: 更新 imports + 在 Calendar.tsx 中新增色阶计算和月度汇总的 useMemo**

将顶部 import 从：
```tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { getCalendarDays, formatAmount } from '../utils/format';
import type { CalendarDay } from '../utils/format';
```
改为：
```tsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { getCalendarDays, formatAmount } from '../utils/format';
import type { CalendarDay } from '../utils/format';
```

在函数组件内部，`useTransactions()` 调用之后添加：
```tsx
const { getById } = useCategories();
```

在现有 `dailySummary` 的 useMemo 之后新增以下计算：

```tsx
// 色阶阈值（单位：分）
const HEAT_THRESHOLDS = [0, 1, 5000, 10000, 20000];

function getHeatLevel(amountInCents: number): number {
  if (amountInCents <= 0) return 0;
  if (amountInCents < 5000) return 1;
  if (amountInCents < 10000) return 2;
  if (amountInCents < 20000) return 3;
  return 4;
}

// 热力图背景色映射（复用 Tailwind red 色系）
const HEAT_BG: Record<number, string> = {
  0: 'bg-white border border-[#f0ede7]',
  1: 'bg-red-50',
  2: 'bg-red-100',
  3: 'bg-red-200',
  4: 'bg-red-300',
};

const HEAT_TEXT: Record<number, string> = {
  0: 'text-ink',
  1: 'text-red-600',
  2: 'text-red-600',
  3: 'text-red-800',
  4: 'text-red-900',
};
```

- [ ] **Step 2: 新增月度汇总数据 useMemo**

```tsx
// 月度汇总（含上月对比数据）
const monthSummary = useMemo(() => {
  // 上月
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevMonthPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const currentTxs = transactions.filter(t => t.date.startsWith(`${year}-${String(month).padStart(2, '0')}`));
  const prevTxs = transactions.filter(t => t.date.startsWith(prevMonthPrefix));

  const curExpenses = currentTxs.filter(t => t.type === 'expense');
  const prevExpenses = prevTxs.filter(t => t.type === 'expense');

  // 日均支出
  const curDays = new Set(curExpenses.map(t => t.date)).size || 1;
  const prevDays = new Set(prevExpenses.map(t => t.date)).size || 1;
  const curDailyAvg = curExpenses.reduce((s, t) => s + t.amount, 0) / curDays;
  const prevDailyAvg = prevExpenses.reduce((s, t) => s + t.amount, 0) / prevDays;

  // 月累计（同期：本月截止今天，上月截止同一天）
  const today = new Date();
  const curMonthTotal = curExpenses.reduce((s, t) => s + t.amount, 0);
  const dayOfMonth = Math.min(today.getDate(), new Date(year, month, 0).getDate());
  const prevMonthCutoff = `${prevMonthPrefix}-${String(Math.min(dayOfMonth, new Date(prevYear, prevMonth, 0).getDate())).padStart(2, '0')}`;
  const prevMonthSamePeriod = prevExpenses.filter(t => t.date <= prevMonthCutoff).reduce((s, t) => s + t.amount, 0);

  // 交易天数
  const curTxDays = new Set(curExpenses.map(t => t.date)).size;
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  return {
    dailyAvg: Math.round(curDailyAvg),
    prevDailyAvg: Math.round(prevDailyAvg),
    dailyAvgDelta: prevDailyAvg > 0 ? Math.round(((curDailyAvg - prevDailyAvg) / prevDailyAvg) * 100) : 0,
    monthTotal: curMonthTotal,
    prevMonthSamePeriod,
    monthTotalDelta: prevMonthSamePeriod > 0 ? Math.round(((curMonthTotal - prevMonthSamePeriod) / prevMonthSamePeriod) * 100) : 0,
    txDays: curTxDays,
    totalDays: totalDaysInMonth,
  };
}, [transactions, year, month]);
```

- [ ] **Step 3: 验证编译通过**

```bash
cd "D:\BaiduSyncdisk\02_AI\2.1_Claude Code\2.1.2_Deepseek\Keep_Accounts" && npx tsc --noEmit src/pages/Calendar.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Calendar.tsx
git commit -m "feat: add heatmap color scale and monthly summary computation"
```

---

### Task 2: 月度摘要条组件

- [ ] **Step 1: 替换标题区域，保留下拉框 + 新增摘要条**

将现有标题区域（第53-75行）替换为：

```tsx
{/* 标题 + 月份选择 */}
<div className="flex items-center gap-2 mb-4">
  <h1 className="text-xl font-bold text-ink">日历</h1>
  <div className="flex gap-1.5 ml-auto">
    <select
      value={year}
      onChange={e => setYear(Number(e.target.value))}
      className="px-2.5 py-1.5 rounded-lg border border-border text-sm bg-white text-ink"
    >
      {YEARS.map(y => <option key={y} value={y}>{y}年</option>)}
    </select>
    <select
      value={month}
      onChange={e => setMonth(Number(e.target.value))}
      className="px-2.5 py-1.5 rounded-lg border border-border text-sm bg-white text-ink"
    >
      {MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
    </select>
  </div>
</div>

{/* 月度摘要条 */}
<div className="card p-3 mb-4">
  <div className="flex justify-between items-center">
    <div className="text-center flex-1">
      <p className="text-[10px] text-gray-400 mb-0.5">日均支出</p>
      <p className="text-[17px] font-bold text-ink tabular-nums">
        {formatAmount(monthSummary.dailyAvg)}
      </p>
      {monthSummary.dailyAvgDelta !== 0 && (
        <p className={`text-[10px] mt-0.5 ${monthSummary.dailyAvgDelta > 0 ? 'text-expense' : 'text-income'}`}>
          较上月 {monthSummary.dailyAvgDelta > 0 ? '▲' : '▼'}{Math.abs(monthSummary.dailyAvgDelta)}%
        </p>
      )}
    </div>
    <div className="w-px h-9 bg-border mx-2" />
    <div className="text-center flex-1">
      <p className="text-[10px] text-gray-400 mb-0.5">月累计</p>
      <p className="text-[17px] font-bold text-ink tabular-nums">
        {formatAmount(monthSummary.monthTotal)}
      </p>
      {monthSummary.monthTotalDelta !== 0 && (
        <p className={`text-[10px] mt-0.5 ${monthSummary.monthTotalDelta > 0 ? 'text-expense' : 'text-income'}`}>
          较上月 {monthSummary.monthTotalDelta > 0 ? '▲' : '▼'}{Math.abs(monthSummary.monthTotalDelta)}%
        </p>
      )}
    </div>
    <div className="w-px h-9 bg-border mx-2" />
    <div className="text-center flex-1">
      <p className="text-[10px] text-gray-400 mb-0.5">交易天数</p>
      <p className="text-[17px] font-bold text-ink tabular-nums">
        {monthSummary.txDays}<span className="text-xs font-normal text-gray-400">/{monthSummary.totalDays}</span>
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">{monthSummary.totalDays}天</p>
    </div>
  </div>
</div>
```

- [ ] **Step 2: 验证编译通过**

```bash
npx tsc --noEmit src/pages/Calendar.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Calendar.tsx
git commit -m "feat: add monthly summary bar with delta indicators"
```

---

### Task 3: 热力图网格渲染

- [ ] **Step 1: 改造日历网格为热力图风格**

替换现有日历网格区域（第78-131行）为：

```tsx
{/* 星期头 */}
<div className="grid grid-cols-7 mb-1">
  {['一', '二', '三', '四', '五', '六', '日'].map(w => (
    <div key={w} className="text-center text-[11px] text-gray-300 py-2 font-medium">
      {w}
    </div>
  ))}
</div>

{/* 热力图网格 */}
<div className="grid grid-cols-7 gap-[3px]">
  {days.map((day) => {
    const summary = dailySummary.get(day.date);
    const expenseAmount = summary?.expense || 0;
    const heatLevel = getHeatLevel(expenseAmount);
    const hasIncome = summary && summary.income > 0;
    const isSelected = selectedDate === day.date;

    if (!day.isCurrentMonth) {
      return (
        <div
          key={day.date}
          className="bg-[#f0ede7] rounded-lg min-h-[52px] p-2 flex items-end justify-end"
        >
          <span className="text-xs text-gray-300">{day.day}</span>
        </div>
      );
    }

    return (
      <div
        key={day.date}
        onClick={() => {
          if (expenseAmount > 0 || hasIncome) {
            setSelectedDate(selectedDate === day.date ? null : day.date);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (expenseAmount > 0 || hasIncome) {
            navigate(`/records?date=${day.date}`);
          }
        }}
        className={`
          ${HEAT_BG[heatLevel]}
          rounded-lg min-h-[52px] p-2 flex flex-col justify-between
          relative cursor-pointer select-none
          transition-all duration-150
          ${isSelected ? 'ring-2 ring-blue-400 scale-[1.05] shadow-md z-10' : ''}
          ${!isSelected && selectedDate ? 'opacity-50' : ''}
          ${day.isToday ? 'ring-1 ring-inset ring-blue-400' : ''}
          ${expenseAmount === 0 && !hasIncome ? 'cursor-default active:bg-transparent' : 'active:bg-blue-50/30'}
        `}
      >
        {/* 收入标记 */}
        {hasIncome && (
          <span className="absolute top-1.5 left-1.5 w-[5px] h-[5px] rounded-full bg-[#10b981]" />
        )}
        {/* 日期数字 */}
        <span className={`
          text-xs self-end leading-none
          ${HEAT_TEXT[heatLevel]}
          ${day.isToday ? 'font-semibold text-blue-500' : heatLevel >= 3 ? 'font-semibold' : ''}
        `}>
          {day.day}
        </span>
        {/* 支出金额 */}
        {expenseAmount > 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className={`
              tabular-nums font-bold leading-tight
              ${expenseAmount >= 20000 ? 'text-base' : expenseAmount >= 10000 ? 'text-sm' : expenseAmount >= 5000 ? 'text-xs' : 'text-[11px]'}
              ${HEAT_TEXT[heatLevel]}
              ${isSelected ? '' : ''}
            `}>
              {formatAmount(expenseAmount)}
            </span>
          </div>
        )}
      </div>
    );
  })}
</div>

{/* 色阶图例 */}
<div className="flex items-center gap-2 mt-3 px-1">
  <span className="text-[10px] text-gray-300">¥0</span>
  <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-[#f0ede7] via-red-200 to-red-300" />
  <span className="text-[10px] text-gray-300">¥200+</span>
</div>
```

- [ ] **Step 2: 新增 selectedDate 状态**

在组件顶部状态声明区域添加：

```tsx
const [selectedDate, setSelectedDate] = useState<string | null>(null);
```

- [ ] **Step 3: 验证编译通过**

```bash
npx tsc --noEmit src/pages/Calendar.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Calendar.tsx
git commit -m "feat: heatmap grid with 5-level color encoding"
```

---

### Task 4: 详情面板（点击展开）

- [ ] **Step 1: 当日分类汇总计算 useMemo**

在 `monthSummary` useMemo 之后添加：

```tsx
// 选中日期的分类明细
const selectedDayDetail = useMemo(() => {
  if (!selectedDate) return null;

  const dayTxs = transactions.filter(t => t.date === selectedDate);
  const expenses = dayTxs.filter(t => t.type === 'expense');
  const incomes = dayTxs.filter(t => t.type === 'income');

  // 按分类汇总支出
  const byCategory = new Map<string, { amount: number }>();
  expenses.forEach(tx => {
    const entry = byCategory.get(tx.categoryId) || { amount: 0 };
    entry.amount += tx.amount;
    byCategory.set(tx.categoryId, entry);
  });

  // 计算各分类本月日均
  const currentMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const categoryDailyAvgs = new Map<string, number>();
  byCategory.forEach((_, catId) => {
    const catTxs = transactions.filter(t =>
      t.type === 'expense' &&
      t.categoryId === catId &&
      t.date.startsWith(currentMonthPrefix)
    );
    const catDays = new Set(catTxs.map(t => t.date)).size || 1;
    categoryDailyAvgs.set(catId, catTxs.reduce((s, t) => s + t.amount, 0) / catDays);
  });

  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
  const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][new Date(selectedDate).getDay()];

  return {
    date: selectedDate,
    dayOfWeek,
    totalExpense,
    totalIncome,
    categories: Array.from(byCategory.entries()).map(([catId, data]) => {
      const avg = categoryDailyAvgs.get(catId) || 0;
      const delta = avg > 0 ? Math.round(((data.amount - avg) / avg) * 100) : 0;
      return { categoryId: catId, amount: data.amount, dailyAvg: Math.round(avg), delta };
    }).sort((a, b) => b.amount - a.amount),
  };
}, [selectedDate, transactions, year, month]);
```

- [ ] **Step 2: 渲染详情面板**

在日历网格的 `</div>` 之后、色阶图例之前插入：

```tsx
{/* 详情面板 */}
{selectedDayDetail && (
  <div className="mt-3 bg-white rounded-2xl border border-border animate-slide-up">
    {/* 拖拽指示条 */}
    <div className="flex justify-center pt-2 pb-1">
      <div className="w-8 h-1 rounded-full bg-gray-300" />
    </div>
    <div className="px-4 pb-3">
      {/* 日期 + 总计 */}
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-semibold text-ink">
          {`${month}月${new Date(selectedDayDetail.date).getDate()}日 · 周${selectedDayDetail.dayOfWeek}`}
        </span>
        <span className="text-xl font-bold text-expense tabular-nums">
          ¥{formatAmount(selectedDayDetail.totalExpense)}
        </span>
      </div>
      {/* 收入（如有） */}
      {selectedDayDetail.totalIncome > 0 && (
        <p className="text-xs text-income mb-2">
          收入 ¥{formatAmount(selectedDayDetail.totalIncome)}
        </p>
      )}
      {/* 长按提示 */}
      <p className="text-[10px] text-gray-300 mb-2">长按日期格跳转查看全部记录</p>
      {/* 分类明细 */}
      {selectedDayDetail.categories.map((item) => {
        const cat = getById(item.categoryId);
        return (
          <div key={item.categoryId} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-base">{cat?.icon || '📌'}</span>
              <span className="text-[13px] text-ink">{cat?.name || '未知'}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-expense tabular-nums">
                ¥{formatAmount(item.amount)}
              </span>
              {item.delta !== 0 && (
                <span className={`text-[10px] ml-1 ${item.delta > 0 ? 'text-expense' : 'text-income'}`}>
                  {item.delta > 0 ? '▲' : '▼'}{Math.abs(item.delta)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 3: 验证编译通过**

```bash
npx tsc --noEmit src/pages/Calendar.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Calendar.tsx
git commit -m "feat: add expandable detail panel with category breakdown"
```

---

### Task 5: 加载态和空状态

- [ ] **Step 1: 更新加载态**

将现有加载代码（第41-48行）替换为：

```tsx
if (loading) {
  return (
    <div className="px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-xl font-bold text-ink">日历</h1>
      </div>
      {/* 摘要条骨架 */}
      <div className="card p-3 mb-4 animate-pulse">
        <div className="flex justify-between">
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="h-2.5 w-10 bg-gray-200 rounded" />
            <div className="h-5 w-14 bg-gray-200 rounded" />
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="h-2.5 w-10 bg-gray-200 rounded" />
            <div className="h-5 w-14 bg-gray-200 rounded" />
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="h-2.5 w-10 bg-gray-200 rounded" />
            <div className="h-5 w-14 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
      {/* 网格骨架 */}
      <div className="grid grid-cols-7 gap-[3px]">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg min-h-[52px] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 更新空状态（当月无交易）**

在热力图网格之后、详情面板之后，添加空状态提示。在 `days` 渲染区域内，当本月无任何有支出的日期时，图例下方显示：

```tsx
{/* 空状态提示 */}
{monthSummary.txDays === 0 && !loading && (
  <div className="text-center py-10">
    <p className="text-2xl mb-2">📝</p>
    <p className="text-sm text-gray-400">这个月还没有记录</p>
  </div>
)}
```

- [ ] **Step 3: 验证编译通过**

```bash
npx tsc --noEmit src/pages/Calendar.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Calendar.tsx
git commit -m "feat: loading skeleton and empty state for calendar"
```

---

### Task 6: 动画微调与收尾

- [ ] **Step 1: 确保月份切换时选中状态清除**

在 `year`/`month` 变化时重置 `selectedDate`：

```tsx
// 在 year/month state 声明之后添加
useEffect(() => {
  setSelectedDate(null);
}, [year, month]);
```

- [ ] **Step 2: 移除不再使用的代码**

确认删除以下不再需要的代码：
- 旧的 `handleDayClick` 函数
- 旧的 grid 渲染（`border-collapse` 风格）
- 旧的 `ring-1 ring-inset ring-blue-400` 样式（已整合到新格子中）

- [ ] **Step 3: 完整类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 启动 dev server 手动验证**

```bash
npx vite --host
```

打开浏览器，确认：
1. 日历页正常渲染
2. 下拉框切换月份正常
3. 热力图色阶随金额变化
4. 点击日期展开详情面板
5. 再次点击关闭面板
6. 非当月日期灰色显示
7. 空月份显示空状态提示

- [ ] **Step 5: Commit**

```bash
git add src/pages/Calendar.tsx
git commit -m "chore: finalize calendar redesign with animations and cleanup"
```
