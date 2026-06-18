# 预算执行率历史对比 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reports 页面新增预算执行率历史对比模块，自由选择起止月份，表格+混合图表展示总预算和各分类的预算执行率。

**Architecture:** IAdapter 新增 `getBudgetsInRange` 按月范围查询预算；useBudget 新增 `getBudgetHistory` 计算每月执行率；新建 BudgetHistory 组件（自包含表格和 ComposedChart），Reports 页面 lazy 加载到异常预警下方。

**Tech Stack:** React 18 + TypeScript + Dexie.js + Recharts (ComposedChart, Bar, Line)

---

### Task 1: IAdapter 接口新增 getBudgetsInRange

**Files:**
- Modify: `src/adapters/types.ts:31-31`

- [ ] **Step 1: 在 IAdapter 接口中添加方法签名**

在 `deleteBudgetsByCategory` 之后添加：

```ts
getBudgetsInRange(startMonth: string, endMonth: string): Promise<Budget[]>;
```

- [ ] **Step 2: 提交**

```bash
git add src/adapters/types.ts
git commit -m "feat: add getBudgetsInRange to IAdapter interface"
```

---

### Task 2: DexieAdapter 实现 getBudgetsInRange

**Files:**
- Modify: `src/adapters/dexie.ts:117-117`

- [ ] **Step 1: 实现方法**

在 `deleteBudgetsByCategory` 之后添加：

```ts
async getBudgetsInRange(startMonth: string, endMonth: string) {
  return db.budgets.where('month').between(startMonth, endMonth, true, true).toArray();
},
```

说明：`month` 字段格式 YYYY-MM，字符串字典序与时间顺序一致，`between` 直接可用。

- [ ] **Step 2: 提交**

```bash
git add src/adapters/dexie.ts
git commit -m "feat: implement getBudgetsInRange in DexieAdapter"
```

---

### Task 3: useBudget 新增 getBudgetHistory 方法

**Files:**
- Modify: `src/hooks/useBudget.ts:133-136`

- [ ] **Step 1: 添加返回类型定义**

在文件顶部 `import` 语句之后、`useBudget` 函数之前添加：

```ts
export interface BudgetCategoryRate {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  color?: string;
  budget: number;
  spent: number;
  rate: number;
}

export interface BudgetHistoryItem {
  month: string;
  totalBudget: number;
  totalSpent: number;
  totalRate: number;
  categories: BudgetCategoryRate[];
}
```

- [ ] **Step 2: 添加 getBudgetHistory 方法**

在 `checkAlerts` 之后、`return` 语句之前添加：

```ts
const getBudgetHistory = useCallback(async (startMonth: string, endMonth: string) => {
  const allBudgets = await adapter.getBudgetsInRange(startMonth, endMonth);
  const categories = await adapter.getAllCategories();

  // 按月份分组
  const byMonth = new Map<string, Budget[]>();
  for (const b of allBudgets) {
    if (!byMonth.has(b.month)) byMonth.set(b.month, []);
    byMonth.get(b.month)!.push(b);
  }

  const result: BudgetHistoryItem[] = [];

  for (const [month, monthBudgets] of byMonth) {
    const txs = await adapter.getTransactionsByMonth(month);
    const expenseTxs = txs.filter(t => t.type === 'expense');
    const totalSpent = expenseTxs.reduce((s, t) => s + t.amount, 0);

    const totalBudget = monthBudgets.find(b => !b.categoryId || b.categoryId === '__total__');

    const categoryRates: BudgetCategoryRate[] = [];

    for (const b of monthBudgets) {
      if (!b.categoryId || b.categoryId === '__total__') continue;

      const cat = categories.find(c => c.id === b.categoryId);
      if (!cat) continue;

      // 计算该分类及其子分类的支出
      const spent = expenseTxs
        .filter(t => {
          if (t.categoryId === b.categoryId) return true;
          const txCat = categories.find(c => c.id === t.categoryId);
          return txCat?.parentId === b.categoryId;
        })
        .reduce((s, t) => s + t.amount, 0);

      categoryRates.push({
        categoryId: b.categoryId,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        color: cat.color,
        budget: b.amount,
        spent,
        rate: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
      });
    }

    result.push({
      month,
      totalBudget: totalBudget?.amount ?? 0,
      totalSpent,
      totalRate: totalBudget && totalBudget.amount > 0
        ? Math.round((totalSpent / totalBudget.amount) * 100)
        : 0,
      categories: categoryRates,
    });
  }

  return result.sort((a, b) => a.month.localeCompare(b.month));
}, [adapter]);
```

- [ ] **Step 3: 将 getBudgetHistory 加入 return**

修改 return 语句，添加 `getBudgetHistory`：

```ts
return { budgets, loading, getBudget, setBudget, removeBudget, calculateProgress, checkAlerts, getBudgetHistory, reload: load };
```

- [ ] **Step 4: 提交**

```bash
git add src/hooks/useBudget.ts
git commit -m "feat: add getBudgetHistory to useBudget hook"
```

---

### Task 4: useBudget.getBudgetHistory 单元测试

**Files:**
- Modify: `src/hooks/__tests__/useBudget.test.ts`

- [ ] **Step 1: 添加测试用例**

在文件末尾 `checkAlerts` describe 块之后、文件最后的 `});` 之前添加：

```ts
  describe('getBudgetHistory', () => {
    it('返回按月份排序的预算执行率数据', async () => {
      const budgetsInRange = [
        { id: 'b1', categoryId: '__total__', month: '2026-04', amount: 500000 },
        { id: 'b2', categoryId: 'cat_food', month: '2026-04', amount: 200000 },
        { id: 'b3', categoryId: '__total__', month: '2026-05', amount: 500000 },
        { id: 'b4', categoryId: 'cat_food', month: '2026-05', amount: 150000 },
      ];
      (adapter.getBudgetsInRange as any).mockResolvedValue(budgetsInRange);
      (adapter.getAllCategories as any).mockResolvedValue([
        { id: 'cat_food', name: '餐饮', type: 'expense', icon: '🍜', order: 1, color: '#ef4444' },
        { id: 'cat_sub_takeout', name: '外卖', type: 'expense', icon: '🥡', order: 1, parentId: 'cat_food' },
      ]);
      (adapter.getTransactionsByMonth as any).mockImplementation((month: string) => {
        if (month === '2026-04') return Promise.resolve([
          { id: '1', type: 'expense', amount: 160000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-04-15', createdAt: 1 },
          { id: '2', type: 'expense', amount: 30000, categoryId: 'cat_sub_takeout', paymentMethod: 'wechat', date: '2026-04-16', createdAt: 2 },
        ]);
        if (month === '2026-05') return Promise.resolve([
          { id: '3', type: 'expense', amount: 100000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-05-10', createdAt: 3 },
        ]);
        return Promise.resolve([]);
      });

      const { result } = renderHook(() => useBudget('2026-06', adapter));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const history = await result.current.getBudgetHistory('2026-04', '2026-06');

      expect(history).toHaveLength(2);
      // 按月份升序
      expect(history[0].month).toBe('2026-04');
      expect(history[1].month).toBe('2026-05');

      // 4月：总预算 500000，餐饮支出 160000+30000=190000，执行率 190000/500000=38%
      expect(history[0].totalBudget).toBe(500000);
      expect(history[0].totalSpent).toBe(190000);
      expect(history[0].totalRate).toBe(38);

      // 4月餐饮分类：预算 200000，支出 190000（含子分类），执行率 95%
      expect(history[0].categories).toHaveLength(1);
      expect(history[0].categories[0].categoryName).toBe('餐饮');
      expect(history[0].categories[0].budget).toBe(200000);
      expect(history[0].categories[0].spent).toBe(190000);
      expect(history[0].categories[0].rate).toBe(95);

      // 5月：总预算 500000，餐饮支出 100000，执行率 20%
      expect(history[1].totalRate).toBe(20);
      expect(history[1].categories[0].rate).toBe(67); // 100000/150000≈67%
    });

    it('范围内没有预算时返回空数组', async () => {
      (adapter.getBudgetsInRange as any).mockResolvedValue([]);

      const { result } = renderHook(() => useBudget('2026-06', adapter));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const history = await result.current.getBudgetHistory('2026-01', '2026-03');
      expect(history).toEqual([]);
    });

    it('某月只有总预算无分类预算时不包含 categories', async () => {
      (adapter.getBudgetsInRange as any).mockResolvedValue([
        { id: 'b1', categoryId: '__total__', month: '2026-04', amount: 300000 },
      ]);
      (adapter.getAllCategories as any).mockResolvedValue([]);
      (adapter.getTransactionsByMonth as any).mockResolvedValue([
        { id: '1', type: 'expense', amount: 150000, categoryId: 'cat_food', paymentMethod: 'wechat', date: '2026-04-15', createdAt: 1 },
      ]);

      const { result } = renderHook(() => useBudget('2026-06', adapter));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const history = await result.current.getBudgetHistory('2026-04', '2026-04');
      expect(history).toHaveLength(1);
      expect(history[0].totalRate).toBe(50);
      expect(history[0].categories).toEqual([]);
    });
  });
```

注意：mock adapter 缺少 `getBudgetsInRange` 方法需要补充。

- [ ] **Step 2: 更新 createMockAdapter 补充 getBudgetsInRange**

在 `createMockAdapter` 函数的返回对象中，`deleteBudgetsByCategory` 之后添加：

```ts
getBudgetsInRange: vi.fn(() => Promise.resolve([])),
```

- [ ] **Step 3: 运行测试验证失败（新方法尚未 export）**

```bash
npx vitest run src/hooks/__tests__/useBudget.test.ts
```

- [ ] **Step 4: 运行测试验证全部通过**

```bash
npx vitest run src/hooks/__tests__/useBudget.test.ts
```

预期：新增 3 个测试用例全部通过，原有 10 个测试不受影响。

- [ ] **Step 5: 提交**

```bash
git add src/hooks/__tests__/useBudget.test.ts
git commit -m "test: add getBudgetHistory unit tests"
```

---

### Task 5: 创建 BudgetHistory 组件

**Files:**
- Create: `src/components/BudgetHistory.tsx`

- [ ] **Step 1: 创建组件文件**

```tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBudget, type BudgetHistoryItem } from '../hooks/useBudget';
import { getYearOptions, getMonthOptions, formatAmount } from '../utils/format';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

function rateColor(rate: number): string {
  if (rate >= 100) return 'text-red-500';
  if (rate >= 80) return 'text-amber-500';
  return 'text-green-500';
}

type ViewMode = 'table' | 'chart';
type TableOrientation = 'monthsAsRows' | 'categoriesAsRows';

export default function BudgetHistory() {
  const { getBudgetHistory } = useBudget();

  // 默认范围：6个月前（含当前月）
  const defaultStart = new Date(CURRENT_YEAR, CURRENT_MONTH - 6, 1);
  const [startYear, setStartYear] = useState(defaultStart.getFullYear());
  const [startMonth, setStartMonth] = useState(defaultStart.getMonth() + 1);
  const [endYear, setEndYear] = useState(CURRENT_YEAR);
  const [endMonth, setEndMonth] = useState(CURRENT_MONTH);

  const [data, setData] = useState<BudgetHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [tableOrientation, setTableOrientation] = useState<TableOrientation>('monthsAsRows');

  const yearOptions = useMemo(() => getYearOptions(), []);
  const startMonthOptions = useMemo(() => getMonthOptions(startYear), [startYear]);
  const endMonthOptions = useMemo(() => getMonthOptions(endYear), [endYear]);

  const loadData = useCallback(async () => {
    const sm = `${startYear}-${String(startMonth).padStart(2, '0')}`;
    const em = `${endYear}-${String(endMonth).padStart(2, '0')}`;
    if (sm > em) return;
    setLoading(true);
    const result = await getBudgetHistory(sm, em);
    setData(result);
    setLoading(false);
  }, [startYear, startMonth, endYear, endMonth, getBudgetHistory]);

  useEffect(() => { loadData(); }, [loadData]);

  // 处理起始年变化导致月份超出范围
  const handleStartYearChange = (y: number) => {
    setStartYear(y);
    const maxMonth = getMonthOptions(y).length;
    if (startMonth > maxMonth) setStartMonth(maxMonth);
  };
  const handleEndYearChange = (y: number) => {
    setEndYear(y);
    const maxMonth = getMonthOptions(y).length;
    if (endMonth > maxMonth) setEndMonth(maxMonth);
  };

  // 收集所有出现过的分类（并集），按字母序保持稳定
  const allCategoryKeys = useMemo(() => {
    const set = new Map<string, { name: string; icon: string; color?: string }>();
    data.forEach(item => {
      item.categories.forEach(c => {
        if (!set.has(c.categoryId)) {
          set.set(c.categoryId, { name: c.categoryName, icon: c.categoryIcon, color: c.color });
        }
      });
    });
    return Array.from(set.entries()).map(([id, info]) => ({ categoryId: id, ...info }));
  }, [data]);

  // 月份格式化为 "06月"
  const formatMonthLabel = (m: string) => m.slice(5) + '月';

  // 图表数据
  const chartData = useMemo(() => {
    return data.map(item => {
      const point: Record<string, number | string> = {
        month: formatMonthLabel(item.month),
        总预算执行率: item.totalRate,
      };
      item.categories.forEach(c => {
        point[c.categoryName] = c.rate;
      });
      return point;
    });
  }, [data]);

  // 分类折线颜色
  const categoryLineKeys = useMemo(() => {
    return allCategoryKeys.map(c => c.name);
  }, [allCategoryKeys]);

  const categoryColors = useMemo(() => {
    const defaultColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    return allCategoryKeys.map((c, i) => c.color || defaultColors[i % defaultColors.length]);
  }, [allCategoryKeys]);

  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-ink mb-3">预算执行率对比</h2>

      {/* 月份范围选择器 */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <select value={startYear} onChange={e => handleStartYearChange(Number(e.target.value))}
          className="px-2 py-1 rounded-lg border border-border text-sm bg-white text-ink">
          {yearOptions.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))}
          className="px-2 py-1 rounded-lg border border-border text-sm bg-white text-ink">
          {startMonthOptions.map(m => <option key={m} value={m}>{m}月</option>)}
        </select>
        <span className="text-xs text-gray-400 mx-1">—</span>
        <select value={endYear} onChange={e => handleEndYearChange(Number(e.target.value))}
          className="px-2 py-1 rounded-lg border border-border text-sm bg-white text-ink">
          {yearOptions.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))}
          className="px-2 py-1 rounded-lg border border-border text-sm bg-white text-ink">
          {endMonthOptions.map(m => <option key={m} value={m}>{m}月</option>)}
        </select>

        {/* 视图切换 */}
        <div className="flex gap-0.5 ml-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'table' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            表格
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'chart' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            图表
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-6 text-sm">加载中...</p>
      ) : data.length === 0 ? (
        <p className="text-center text-gray-400 py-6 text-sm">所选范围内无预算记录</p>
      ) : viewMode === 'table' ? (
        /* 表格模式 */
        <div>
          {/* 行列切换 */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setTableOrientation(
                tableOrientation === 'monthsAsRows' ? 'categoriesAsRows' : 'monthsAsRows'
              )}
              className="px-2 py-1 text-xs text-blue-500 hover:bg-blue-50 rounded"
            >
              {tableOrientation === 'monthsAsRows' ? '行↔列切换' : '行↔列切换'}
            </button>
          </div>

          <div className="overflow-x-auto">
            {tableOrientation === 'monthsAsRows' ? (
              /* 行=月份，列=总预算+分类 */
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 px-2 text-gray-400 font-normal">月份</th>
                    <th className="text-right py-1.5 px-2 text-gray-400 font-normal">总预算</th>
                    {allCategoryKeys.map(c => (
                      <th key={c.categoryId} className="text-right py-1.5 px-2 text-gray-400 font-normal">
                        {c.icon} {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map(item => (
                    <tr key={item.month} className="border-b border-gray-50">
                      <td className="py-1.5 px-2 text-ink">{formatMonthLabel(item.month)}</td>
                      <td className={`py-1.5 px-2 text-right tabular-nums ${rateColor(item.totalRate)}`}>
                        {item.totalBudget > 0 ? `${item.totalRate}%` : '—'}
                      </td>
                      {allCategoryKeys.map(ck => {
                        const catData = item.categories.find(c => c.categoryId === ck.categoryId);
                        return (
                          <td key={ck.categoryId} className={`py-1.5 px-2 text-right tabular-nums ${
                            catData ? rateColor(catData.rate) : 'text-gray-300'
                          }`}>
                            {catData ? `${catData.rate}%` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* 行=总预算+分类，列=月份 */
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 px-2 text-gray-400 font-normal">类别</th>
                    {data.map(item => (
                      <th key={item.month} className="text-right py-1.5 px-2 text-gray-400 font-normal">
                        {formatMonthLabel(item.month)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-50">
                    <td className="py-1.5 px-2 text-ink">💰 总预算</td>
                    {data.map(item => (
                      <td key={item.month} className={`py-1.5 px-2 text-right tabular-nums ${rateColor(item.totalRate)}`}>
                        {item.totalBudget > 0 ? `${item.totalRate}%` : '—'}
                      </td>
                    ))}
                  </tr>
                  {allCategoryKeys.map(ck => (
                    <tr key={ck.categoryId} className="border-b border-gray-50">
                      <td className="py-1.5 px-2 text-ink">{ck.icon} {ck.name}</td>
                      {data.map(item => {
                        const catData = item.categories.find(c => c.categoryId === ck.categoryId);
                        return (
                          <td key={item.month} className={`py-1.5 px-2 text-right tabular-nums ${
                            catData ? rateColor(catData.rate) : 'text-gray-300'
                          }`}>
                            {catData ? `${catData.rate}%` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* 图表模式 */
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={[0, (dataMax: number) => Math.min(Math.ceil(dataMax * 1.15), dataMax + 20)]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip formatter={(value: number) => `${value}%`} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="总预算执行率" fill="#3b82f6" barSize={20} radius={[4, 4, 0, 0]} />
              {categoryLineKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={categoryColors[i]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/BudgetHistory.tsx
git commit -m "feat: add BudgetHistory component with table and chart views"
```

---

### Task 6: Reports 页面集成 BudgetHistory

**Files:**
- Modify: `src/pages/Reports.tsx`

- [ ] **Step 1: 添加 lazy import**

在文件顶部，`Charts` 的 lazy import 下方添加：

```tsx
const BudgetHistory = lazy(() => import('../components/BudgetHistory'));
```

- [ ] **Step 2: 在异常预警下方渲染 BudgetHistory**

在 `{anomalies.length > 0 && (...)}` 整个区块之后、`</div>` 之前添加：

```tsx
      {/* Budget history comparison */}
      <div className="mt-4">
        <Suspense fallback={<div className="card p-4"><p className="text-center text-gray-400 py-6 text-sm">加载中...</p></div>}>
          <BudgetHistory />
        </Suspense>
      </div>
```

- [ ] **Step 3: 提交**

```bash
git add src/pages/Reports.tsx
git commit -m "feat: integrate BudgetHistory into Reports page"
```

---

### Task 7: 验证

- [ ] **Step 1: 运行全部测试**

```bash
npx vitest run
```

预期：所有测试通过（含新增 3 个 getBudgetHistory 测试）。

- [ ] **Step 2: 构建检查**

```bash
npm run build
```

预期：构建成功，BudgetHistory 作为独立 chunk 分割。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "chore: final verification after budget history integration"
```

---

### 文件变更汇总

| 操作 | 文件 |
|------|------|
| 修改 | `src/adapters/types.ts` |
| 修改 | `src/adapters/dexie.ts` |
| 修改 | `src/hooks/useBudget.ts` |
| 修改 | `src/hooks/__tests__/useBudget.test.ts` |
| 新建 | `src/components/BudgetHistory.tsx` |
| 修改 | `src/pages/Reports.tsx` |
