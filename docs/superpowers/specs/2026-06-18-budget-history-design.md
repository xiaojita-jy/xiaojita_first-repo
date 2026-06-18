# 预算执行率历史对比 — 设计文档

日期：2026-06-18

## 目标

在 Reports 页面新增"预算执行率历史对比"模块，用户可以自由选择起止月份，查看有预算月份的预算执行率，以表格和混合图表两种形式展示。

## 数据层

### useBudget 新增方法

`getBudgetHistory(startMonth: string, endMonth: string)`

- 输入：起止月份 `YYYY-MM`
- 查询 budgets 表，取出起止范围内所有月份有预算记录的月份
- 每月计算：
  - 总预算 + 总支出（该月所有 expense 交易之和）+ 总执行率
  - 各分类预算 + 各分类支出（该月该分类及其子分类 expense 交易之和）+ 分类执行率
- 只返回至少有一条预算记录的月份
- 返回结构：

```ts
interface BudgetHistoryItem {
  month: string;                    // YYYY-MM
  totalBudget: number;             // 分
  totalSpent: number;              // 分
  totalRate: number;               // 0-100 整数百分比
  categories: BudgetCategoryRate[];
}

interface BudgetCategoryRate {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  color?: string;
  budget: number;                  // 分
  spent: number;                   // 分
  rate: number;                    // 0-100 整数百分比
}
```

### 实现位置

- `src/hooks/useBudget.ts`：新增 `getBudgetHistory` 方法
- 单元测试：`src/hooks/__tests__/useBudget.test.ts`

## UI 层

### 位置

Reports 页面（`src/pages/Reports.tsx`），在"异常预警"区块下方。

### 布局

```
┌─────────────────────────────────────────────┐
│  预算执行率对比                               │
│  [起始年▼][起始月▼] — [截止年▼][截止月▼]      │
│  [表格] [图表]   [行↔列切换]                  │
│                                              │
│  ┌─表格模式──────────────────────────┐       │
│  │ 月份  │ 总预算 │ 餐饮  │ 交通  │...│       │
│  │ 06月  │  72%  │  85%  │  40%  │   │       │
│  │ 05月  │  68%  │  78%  │  35%  │   │       │
│  └──────────────────────────────────┘       │
│                                              │
│  ┌─图表模式──────────────────────────┐       │
│  │  [柱状：总预算执行率]              │       │
│  │  [折线：各分类执行率]              │       │
│  └──────────────────────────────────┘       │
└─────────────────────────────────────────────┘
```

### 组件拆分

不新建独立页面。在 Reports 页面内新建一个组件 `BudgetHistory`（放 `src/components/BudgetHistory.tsx`），通过 lazy 加载。图表部分复用已有的 Charts chunk 通过 `react.lazy` 懒加载。

### 选择器

- 起止年/月各一组下拉框，复用 Reports 现有样式（`rounded-lg border-border text-sm`）
- 默认起始月份 = 当前月 - 6，默认截止月份 = 当前月

### 表格

- 默认：行=月份，列=总预算+有预算的分类
- 行列切换按钮，切换后行=总预算+分类，列=月份
- 列 = 所有月份出现过预算的分类的并集（某月没设某分类预算时，单元格显示"—"）
- 单元格显示执行率百分比，文字颜色：<80% 绿色，80-99% 琥珀色，≥100% 红色

### 图表

- 使用 Recharts `ComposedChart`
- 总预算执行率用柱状（Bar），各分类执行率用折线（Line）
- 同一图表中 Mix：柱状固定一组，折线按分类动态生成
- 颜色：总预算柱状用蓝色，分类折线用各分类自定义颜色（无自定义则用默认色板）
- Y 轴：0-100%+（允许超预算 >100%，上限动态取 max rate + 10%）
- Charts 组件新增 `budgetHistoryData` prop

### 执行率颜色规则

| 范围 | 颜色 | Tailwind |
|------|------|----------|
| < 80% | 绿色 | text-green-500 |
| 80% ~ 99% | 琥珀色 | text-amber-500 |
| ≥ 100% | 红色 | text-red-500 |

## 不做的

- 不在对比视图中修改预算
- 不在对比视图自动创建预算
- 只显示有预算记录的月份
