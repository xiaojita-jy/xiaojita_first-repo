# 预算超支提醒 — 设计文档

## 目标

记一笔支出时，如果导致总预算或分类预算超阈值，主动弹出提醒告知用户，闭环预算功能。

## 触发时机

1. AddRecord 页面保存交易后
2. Records 页面行内编辑保存后
3. Dashboard 页面顶部汇总预警（已有进度条基础上增加醒目提示）

## 阈值设计

- **黄牌警告**：已用 ≥ 80%（含超支，超支时只显示红牌）
- **红牌超支**：已用 ≥ 100%

黄牌和红牌互斥——超支时只显示红牌，不显示黄牌。

## 提醒内容

- 黄牌：`⚠️ 「{分类名}」预算已用 {百分比}%，剩 {剩余金额}`
- 红牌：`🔴 「{分类名}」已超支 {超支金额}`
- 总预算超支：分类名显示为"月度总预算"

## 技术方案

### 1. useBudget hook — 新增 `checkAlerts()` 方法

```
checkAlerts(): Promise<Alert[]>
```

其中 Alert 类型：
```ts
interface BudgetAlert {
  categoryId: string | undefined;  // undefined = 总预算
  categoryName: string;            // "月度总预算" 或分类名
  categoryIcon: string;            // "💰" 或分类图标
  level: 'warning' | 'danger';     // 黄牌/红牌
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
}
```

`checkAlerts()` 逻辑：
1. 获取当月总预算 + 所有分类预算
2. 获取当月交易，汇总总支出和分类支出
3. 对每个有预算的项目计算 percentage
4. percentage ≥ 100 → level: 'danger'
5. percentage ≥ 80 且 < 100 → level: 'warning'
6. 返回所有超阈值的 alert

### 2. Toast 组件 — 新增 `src/components/Toast.tsx`

- 浮层通知，从顶部滑入
- 3 秒自动消失
- 支持 warning（黄色）和 danger（红色）两种样式
- 可叠加多条（后出现的在上方）
- 使用 React portal 渲染到 body

```
interface ToastMessage {
  id: string;
  type: 'warning' | 'danger';
  message: string;
}
```

Props: `messages: ToastMessage[]`, `onDismiss: (id: string) => void`

### 3. 全局 Toast 容器

在 `Layout.tsx` 中渲染 Toast 容器（fixed 定位），通过一个轻量级的 context 或直接在 Layout 中管理 toast 状态。

简化方案：不引入 Context，直接在 Layout 中维护 `toasts: ToastMessage[]` 状态。子页面通过回调通知 Layout。

更进一步简化：创建一个 `useToast` hook，内部用事件总线（CustomEvent）实现跨组件通信，页面触发 toast 事件，Layout 监听并渲染。

**最终选择**：定制事件方式。优点是不需要 prop drilling，不需要 Context。
- `utils/toast.ts` — `showToast(message, type)` 函数，dispatch CustomEvent
- `components/Toast.tsx` — Toast 渲染组件
- `components/Layout.tsx` — 监听 toast 事件，渲染 Toast 组件

### 4. AddRecord 页面

保存成功后：
1. 调用 `checkAlerts()`
2. 循环 alerts，每个调用 `showToast()`
3. 然后跳转流水页

### 5. Records 页面

编辑保存成功后：
1. 调用 `checkAlerts()`
2. 循环 alerts，每个调用 `showToast()`
3. 刷新列表

### 6. Dashboard 页面

在页面顶部（三卡片下方、本周概览上方）增加预警汇总条：
- 有红牌时：红色背景，列出超支的分类
- 只有黄牌时：黄色背景，列出接近限额的分类
- 无预警时不显示

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `src/models/index.ts` | 新增 `BudgetAlert` 类型 |
| `src/hooks/useBudget.ts` | 新增 `checkAlerts()` 方法 |
| `src/components/Toast.tsx` | **新建** Toast 组件 |
| `src/utils/toast.ts` | **新建** toast 事件工具 |
| `src/components/Layout.tsx` | 集成 Toast 容器 |
| `src/pages/AddRecord.tsx` | 保存后调 checkAlerts + toast |
| `src/pages/Records.tsx` | 编辑保存后调 checkAlerts + toast |
| `src/pages/Dashboard.tsx` | 顶部预警汇总条 |
| `src/hooks/__tests__/useBudget.test.ts` | 新增 checkAlerts 测试 |

## 不做

- PWA push notification（太复杂，MVP 不需要）
- 可配置阈值（先写死 80%/100%）
- 声音/震动提醒
- 预算超支后的自动限制/拦截（只提醒，不阻止）
