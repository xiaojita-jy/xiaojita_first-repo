# formatAmount 取整改造

> 2026-06-22 | 状态：待实现

## 目标

所有金额显示从 `1234.56`（两位小数）改为 `1235`（四舍五入取整）。

## 修改点

### 1. format.ts — 核心函数

- `formatAmount(cents)`：`yuan.toFixed(2)` → `String(Math.round(yuan))`
- 新增可选参数 `opts?: { minOne?: boolean }`：金额 > 0 但取整后 = 0 时返回 `"1"`
- `formatCellAmount` 的 99900 截断阈值改为 `99900`（即 ¥999），同步调整

### 2. 单笔交易 — 加 minOne: true

约 8 处，判断规则：`formatAmount(tx.amount)` / `formatAmount(tpl.amount)` 是单笔金额。

### 3. 搜索 — Records.tsx

搜索同时匹配分值（cents）和显示值（元），用户输 "1234" 或 "123456" 都能命中。

### 4. AmountInput — 占位符

`"0.00"` → `"0"`

### 5. 测试更新

format.test.ts：所有期望值改为整数，新增 minOne 测试用例。

### 6. 不改动

- 色阶阈值、输入正则、数据模型、adapter、存储精度
