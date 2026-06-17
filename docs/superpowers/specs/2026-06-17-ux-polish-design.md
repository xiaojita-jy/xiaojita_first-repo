# Keep Accounts UX 打磨 — 设计文档

**日期:** 2026-06-17
**范围:** 6 个待改进项

---

## 1. 编辑支持跨类型切换（支出 ↔ 收入）

### 现状
Records 页编辑表单的 `editing.type` 在 `handleEdit` 时从交易记录读取后不再可变。分类下拉只显示 `editing.type` 对应类型的分类。

### 方案
- 编辑表单顶部加支出/收入切换按钮，样式复用 AddRecord 页的 `bg-gray-100 rounded-lg p-1` 容器 + 两个按钮
- 切换类型时自动清空 `categoryId`（因为不同交易类型有不同的分类集合）
- `handleSaveEdit` 调用 `update()` 时携带 `type` 字段
- 不影响金额、日期、支付方式、备注字段

### 改动文件
- `src/pages/Records.tsx` — `handleSaveEdit` 加 `type: editing.type`；编辑表单模板加类型切换按钮行；分类下拉中增加类型切换处理

---

## 2. 流水页多选分类筛选

### 现状
`filterCategory` 是单个字符串，通过 `<select>` 单选。筛选逻辑 `tx.categoryId !== filterCategory` 只对比一个 ID。

### 方案
- `filterCategory` 改为 `Set<string>`（空 Set = 全选）
- 筛选逻辑改为：未选中任何分类时显示全部；选中时，交易分类或父分类在 Set 中即匹配
- UI：`<select>` 替换为标签组（chip/tag），点击切换选中状态
- 标签按支出分类展示（一级分类），一行 wrap 布局
- 选中标签蓝色高亮，未选中灰色
- 不增加收入分类标签（流水页主要看支出）

### 改动文件
- `src/pages/Records.tsx` — 状态类型改为 `Set<string>`，筛选逻辑改为 `set.has()`，UI 替换下拉为标签组

---

## 3. Reports 饼图 drill-down 面包屑导航

### 现状
drill-down 到二级分类后标题行显示 `{分类名} - 二级分类 ← 返回`，没有层级路径感。

### 方案
- 将返回按钮改为面包屑：`支出构成 › 餐饮`
- 面包屑样式：可点击部分蓝色，当前层级深色加粗
- 点击「支出构成」回到一级饼图
- 只在 drill-down 状态显示面包屑，一级饼图显示普通标题
- 使用 `›` 分隔符

### 改动文件
- `src/pages/Reports.tsx` — 标题区域模板改造

---

## 4. BOM 问题验证

### 现状
`backup.ts` 使用 `JSON.stringify` + `new Blob([...], { type: 'application/json' })` 生成下载文件。此流程不会引入 UTF-8 BOM。问题可能源自旧版代码，当前版本已修复。

### 方案
- 验证：导出备份文件，用 PowerShell 检查前 3 字节
- 如无 BOM：确认已修复，标记完成
- 如有 BOM：添加 `﻿` 移除逻辑

### 改动文件
- 无代码改动（仅验证）

---

## 5. useBudget / useReports hooks 单元测试

### 现状
两个 hooks 直接 import `DexieAdapter`，无法在测试中 mock。现有 `useTransactions.test.ts` 和 `useCategories.test.ts` 使用了 mock 模式。

### 方案
- 重构 hooks：通过可选参数注入 adapter，默认使用 `DexieAdapter`
- 签名改为 `useBudget(month?: string, adapter?: IAdapter)` 和 `useReports(adapter?: IAdapter)`
- 不破坏现有调用方（adapter 参数可选，默认 DexieAdapter）
- 测试覆盖核心场景：load、setBudget、removeBudget、calculateProgress、getCategoryBreakdown 空数据/有数据、getAnomalies 无异常/有异常/多分类

### 改动文件
- `src/hooks/useBudget.ts` — 加 adapter 参数
- `src/hooks/useReports.ts` — 加 adapter 参数
- `src/hooks/__tests__/useBudget.test.ts` — 新建
- `src/hooks/__tests__/useReports.test.ts` — 新建

---

## 6. 代码分割

### 现状
所有页面组件在 `App.tsx` 中直接 import，全部打进一个 bundle（~721KB）。

### 方案
- `React.lazy(() => import('./pages/Xxx'))` + `<Suspense fallback={...}>` 对 6 个页面做路由级拆分
- 加载态用简单的居中 spinner（复用现有加载文案风格）
- 不拆分组件和 hooks（页面级拆分已足够）

### 改动文件
- `src/App.tsx` — 路由组件改为 lazy import

---

## 自审

- **占位符检查：** 无 TBD/TODO
- **一致性：** 所有改动遵循现有数据流（pages → hooks → adapters），不引入新依赖
- **范围：** 6 项独立改动，每项可单独完成和验证
- **歧义：** 无
