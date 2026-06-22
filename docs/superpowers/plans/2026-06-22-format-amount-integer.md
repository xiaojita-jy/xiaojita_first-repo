# formatAmount 取整改造 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `formatAmount` 输出从两位小数改为四舍五入取整，新增 minOne 参数，更新所有调用点和测试。

**Architecture:** 核心改动在 `format.ts` 一个函数，其余为调用点参数补充和测试更新。不改动数据存储层。

**Tech Stack:** TypeScript + Vitest

---

### Task 1: 核心函数 + 测试

**Files:**
- Modify: `src/utils/format.ts:11-13`
- Modify: `src/utils/__tests__/format.test.ts:25-31`

- [ ] **Step 1: 修改 formatAmount 函数**

```ts
export function formatAmount(cents: number, opts?: { minOne?: boolean }): string {
  const yuan = Math.abs(cents) / 100;
  const rounded = Math.round(yuan);
  if (opts?.minOne && rounded === 0 && cents !== 0) return '1';
  return String(rounded);
}
```

- [ ] **Step 2: 更新测试期望值**

```ts
describe('formatAmount', () => {
  it('0 分 → 0', () => expect(formatAmount(0)).toBe('0'));
  it('10000 分 → 100', () => expect(formatAmount(10000)).toBe('100'));
  it('123456 分 → 1235', () => expect(formatAmount(123456)).toBe('1235'));
  it('-500 分 → 5（不输出负号，靠颜色区分）', () => expect(formatAmount(-500)).toBe('5'));
  it('1 分 → 0（取整为 0）', () => expect(formatAmount(1)).toBe('0'));
  it('50 分 → 1（四舍五入）', () => expect(formatAmount(50)).toBe('1'));
  it('1000500 分 → 10005', () => expect(formatAmount(1000500)).toBe('10005'));
  it('minOne: 1 分 → 1', () => expect(formatAmount(1, { minOne: true })).toBe('1'));
  it('minOne: 0 分 → 0', () => expect(formatAmount(0, { minOne: true })).toBe('0'));
  it('minOne: 49 分 → 1', () => expect(formatAmount(49, { minOne: true })).toBe('1'));
});
```

- [ ] **Step 3: 运行测试验证**

```bash
npx vitest run src/utils/__tests__/format.test.ts
```
期望：FAIL — 旧测试期望值仍为小数格式

- [ ] **Step 4: 实现 formatAmount**

运行测试验证 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/utils/format.ts src/utils/__tests__/format.test.ts
git commit -m "feat: formatAmount rounds to integer with minOne option"
```

---

### Task 2: 更新所有单笔交易显示点（加 minOne）

**Files:**
- Modify: `src/pages/Records.tsx:439`
- Modify: `src/pages/Dashboard.tsx:105-106, 146`
- Modify: `src/components/Charts.tsx:78, 82`
- Modify: `src/components/TemplatePicker.tsx:97`
- Modify: `src/pages/Settings.tsx:346`
- Modify: `src/pages/AddRecord.tsx:77, 79`
- Modify: `src/pages/Calendar.tsx:49`

- [ ] **Step 1: 在以下位置将 formatAmount(xxx) 改为 formatAmount(xxx, { minOne: true })**

| 文件 | 行 | 当前代码 | 改为 |
|------|-----|---------|------|
| Records.tsx | 439 | `formatAmount(tx.amount)` | `formatAmount(tx.amount, { minOne: true })` |
| Dashboard.tsx | 105 | `formatAmount(Math.abs(a.remaining))` | `formatAmount(Math.abs(a.remaining), { minOne: true })` |
| Dashboard.tsx | 106 | `formatAmount(a.remaining)` | `formatAmount(a.remaining, { minOne: true })` |
| Dashboard.tsx | 146 | `formatAmount(a.currentAmount)` | `formatAmount(a.currentAmount, { minOne: true })` |
| Charts.tsx | 78 | `formatAmount(tx.amount)` | `formatAmount(tx.amount, { minOne: true })` |
| Charts.tsx | 82 | `formatAmount(subDrilldownCategory.amount)` | `formatAmount(subDrilldownCategory.amount, { minOne: true })` |
| TemplatePicker.tsx | 97 | `formatAmount(tpl.amount)` | `formatAmount(tpl.amount, { minOne: true })` |
| Settings.tsx | 346 | `formatAmount(tpl.amount)` | `formatAmount(tpl.amount, { minOne: true })` |
| AddRecord.tsx | 77 | `formatAmount(Math.abs(alert.remaining))` | `formatAmount(Math.abs(alert.remaining), { minOne: true })` |
| AddRecord.tsx | 79 | `formatAmount(alert.remaining)` | `formatAmount(alert.remaining, { minOne: true })` |

> 汇总值（totals.expense, dayExpense, monthSummary.dailyAvg 等）不加 minOne。

- [ ] **Step 2: 同步修改 Calendar.tsx 的 formatCellAmount**

```ts
function formatCellAmount(cents: number): string {
  if (cents >= 99900) return '999+';
  return formatAmount(cents);
}
```

将 `'¥999+'` 改为 `'999+'`（不再有 ¥ 前缀，因为其他地方也不用了）。

- [ ] **Step 3: 验证 TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 运行全部测试**

```bash
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Records.tsx src/pages/Dashboard.tsx src/components/Charts.tsx src/components/TemplatePicker.tsx src/pages/Settings.tsx src/pages/AddRecord.tsx src/pages/Calendar.tsx
git commit -m "feat: add minOne option to single-transaction amount displays"
```

---

### Task 3: 搜索改造 + AmountInput 占位符

**Files:**
- Modify: `src/pages/Records.tsx:21`
- Modify: `src/components/AmountInput.tsx:18`

- [ ] **Step 1: Records 搜索匹配分值**

```tsx
// 当前
if (formatAmount(tx.amount).includes(q)) return true;

// 改为
const yuanStr = formatAmount(tx.amount);
const centsStr = String(tx.amount);
if (yuanStr.includes(q) || centsStr.includes(q)) return true;
```

- [ ] **Step 2: AmountInput 占位符**

```tsx
// 当前
{value || '0.00'}

// 改为
{value || '0'}
```

- [ ] **Step 3: 验证 TypeScript + 测试**

```bash
npx tsc --noEmit && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Records.tsx src/components/AmountInput.tsx
git commit -m "feat: search matches cents value, AmountInput shows integer placeholder"
```
