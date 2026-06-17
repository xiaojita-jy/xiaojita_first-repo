# CSV Export + Category Icon/Color Customization — Design Spec

**Date:** 2026-06-17
**Status:** approved

---

## 1. CSV Export

### 1.1 Overview

Add CSV export alongside existing JSON backup. Users need CSV for Excel analysis. JSON backup remains for full data restore.

### 1.2 Implementation

**New file:** `src/utils/csv.ts`

```
exportCSV() — fetch all transactions + categories, join, generate CSV, trigger download
```

**Steps:**
1. Fetch all transactions and categories from adapter
2. Build a `Map<id, Category>` for O(1) lookup
3. Map each transaction to a row: date, type label, amount in yuan, parent category name, sub-category name (or ""), payment method label, note (or "")
4. Prepend UTF-8 BOM (`﻿`) for Excel CJK compatibility
5. Generate CSV with proper escaping (fields containing `,` or `"` or newlines get quoted, inner `"` doubled)
6. Create Blob, build download link, click it

**Filename:** `keep-accounts-YYYY-MM-DD.csv`

**CSV columns (7):**
```
日期,类型,金额,一级分类,子分类,支付方式,备注
```

- Type labels: `支出` / `收入`
- Payment method labels: `微信支付`, `支付宝`, `银行卡`, `信用卡`, `现金`, `其他`
- Amount: yuan with 2 decimal places (e.g., `35.50`)

### 1.3 Settings Page Change

Add a "导出 CSV" button in the "数据管理" card, below "导出备份" / "恢复备份".
Button style: outlined/secondary (CSV is supplementary, JSON is primary backup).

### 1.4 Files Changed

| File | Change |
|---|---|
| `src/utils/csv.ts` | New: `exportCSV()` |
| `src/pages/Settings.tsx` | Add CSV export button + handler |

---

## 2. Custom Category Icons & Colors

### 2.1 Overview

- Expand emoji palette from 20 to 50+ emoji covering more life scenarios
- Add free-text emoji input (user can paste any emoji via OS emoji panel)
- Add `color` field to `Category` for per-category accent color
- 14-color preset palette (no free color picker)
- Color used in: Settings category list, Records filter tags, Reports pie chart, CategoryPicker, Dashboard budget bars

### 2.2 Data Model Change

`Category` interface (`src/models/index.ts`):

```ts
export interface Category {
  // ... existing fields unchanged
  color?: string;  // hex color, e.g. '#FF6B6B'. Optional for backward compat.
}
```

No migration needed — existing categories just have `color: undefined`.

### 2.3 CategoryForm Changes (`src/components/CategoryForm.tsx`)

**Emoji palette:**
- Expand `EMOJI_LIST` from 20 to 54 emoji
- New categories: 🍳🥩🍕🥤🍰 (more food), 🚌🚲🚄✈️ (more transport), 💄👗👟 (shopping), 🎸🎮🎨 (entertainment), 💊🏥💉 (medical), 📖🎓✏️ (education), 🐶🐱🐰 (pets), ⚽🏀🎱 (sports), 💻📱⌚ (digital), 🏦💳📊 (finance), 🎂🎉🎊 (celebrations), 🛏️🧹🧺 (household)
- 6-column grid (was 5-column)

**Emoji text input:**
- New input field below the emoji grid, placeholder "或直接输入 emoji"
- Accepts any text, but validates at least one emoji character on save
- Allows pasting from OS emoji panel (Win+. / Ctrl+Cmd+Space)

**Color palette:**
- 14 preset colors in a 7-column grid below emoji input
- Colors: `#EF4444`(红), `#F97316`(橙), `#F59E0B`(琥珀), `#EAB308`(黄), `#84CC16`(青柠), `#22C55E`(绿), `#10B981`(翠绿), `#14B8A6`(青), `#06B6D4`(天蓝), `#3B82F6`(蓝), `#6366F1`(靛), `#8B5CF6`(紫), `#EC4899`(粉), `#6B7280`(灰)
- Each swatch is a 32x32px rounded circle, selected state shows ring
- Default: no color selected (swatches are optional)

**onSave data:**
```ts
{ name: string; icon: string; type: 'expense' | 'income'; color?: string }
```

### 2.4 Color Usage Across Pages

| Location | How color is used |
|---|---|
| **Settings > Category list** | Small colored dot/bar (12x12px rounded) before category name. No dot if no color set. |
| **Records > Category filter pills** | When a category is **selected** (active), the pill background uses the category color at 15% opacity with colored text. Unselected stays neutral gray. If no color, use default blue/green. |
| **Reports > Pie chart** | Pie sectors use category colors. Without colors, fall back to Recharts defaults. Colors assigned per parent category. |
| **CategoryPicker dropdown** | Small colored dot before category name, same as Settings. |
| **Dashboard > Category budget bars** | The category name label on the left gets a colored dot. |

### 2.5 Edge Cases

- **Category with no color**: all rendering locations fall back to current behavior (no dot, default colors)
- **Default categories seeded without colors**: `seedDefaultCategories` skips if category already exists, so existing user categories keep their colors
- **CSV export doesn't include color**: color is a display concern, not data
- **JSON backup includes color**: `Category` is serialized as-is, color field naturally included

### 2.6 Files Changed

| File | Change |
|---|---|
| `src/models/index.ts` | Add `color?: string` to `Category` |
| `src/components/CategoryForm.tsx` | Expand emoji list, add emoji input, add color palette |
| `src/pages/Settings.tsx` | Color dot in category list rows |
| `src/pages/Records.tsx` | Colored active state for category filter pills |
| `src/pages/Reports.tsx` | Category colors in pie chart |
| `src/components/CategoryPicker.tsx` | Color dot before category name (need to review current impl) |
| `src/pages/Dashboard.tsx` | Color dot in budget category labels |

---

## 3. Implementation Order

1. **CSV Export** (isolated, smaller scope, good warm-up)
2. **Category color data layer** (model + form + Settings)
3. **Category color propagation** (Records, Reports, Picker, Dashboard)

## 4. Testing

- CSV export: unit test `generateCSV` function (row mapping, escaping, BOM)
- CategoryForm: test that `onSave` includes `color` when selected, omits when not
- Color rendering: visual verification in each page
