# 记账模板 — 设计文档

**日期**: 2026-06-22  
**状态**: 已确认

## 目标

减少重复记账操作——用户可创建命名模板（保存类型、金额、分类、支付方式、备注），记一笔时一键填充。

## 数据模型

```typescript
interface Template {
  id: string;
  name: string;              // 用户手动命名
  type: 'expense' | 'income';
  amount: number;            // 单位：分
  categoryId: string;
  subCategoryId?: string;
  paymentMethod: PaymentMethod;
  note?: string;
  order: number;
  createdAt: number;         // Unix timestamp (ms)
}
```

模板不绑定月份，是全局可复用的记账预设。

## 数据层改动

### IAdapter 新增方法（`src/adapters/types.ts`）

```typescript
getAllTemplates(): Promise<Template[]>;
addTemplate(t: Template): Promise<void>;
updateTemplate(id: string, data: Partial<Template>): Promise<void>;
deleteTemplate(id: string): Promise<void>;
```

### Dexie 实现（`src/adapters/dexie.ts`）

- 新增 `templates` 表，主键 `id`，索引 `order`
- 实现上述 4 个方法

### 新 Hook（`src/hooks/useTemplates.ts`）

```typescript
function useTemplates(adapter?: IAdapter): {
  templates: Template[];
  loading: boolean;
  error: string | null;
  add(name, fields): Promise<void>;       // 保存为新模板
  update(id, fields): Promise<void>;      // 编辑模板
  remove(id): Promise<void>;              // 删除
  moveUp(id): Promise<void>;              // 排序
  moveDown(id): Promise<void>;
}
```

`add` 参数：name + Omit<Template, 'id' | 'name' | 'order' | 'createdAt'>  
`update` 参数：Partial<除 id 外的所有字段>

## UI 改动

### 记一笔页（`src/pages/AddRecord.tsx`）

底部新增两个按钮，保存按钮上方：

- **📋 使用模板** — 唤起 TemplatePicker 弹窗，选中模板后填充所有 6 个表单字段
- **💾 保存为模板** — 弹出命名输入框（ConfirmDialog 风格），确认后调用 `useTemplates.add()`

TemplatePicker 组件：底部弹出式列表，每行显示模板名称 + 分类图标 + 格式化金额 + 类型标签，点击选中回调。

### 设置页（`src/pages/Settings.tsx`）

分类管理区块下方新增"模板管理"区块：

- 模板列表，每行：模板名称、分类图标+名、金额、类型标签
- 右侧操作区：上移/下移箭头（与分类管理一致）、✏️ 编辑名称、🗑️ 删除（二次确认）
- 编辑名称：点击 ✏️ → 弹出输入框 → 确认保存

## 组件

### TemplatePicker（`src/components/TemplatePicker.tsx`）

Props:
```typescript
interface TemplatePickerProps {
  templates: Template[];
  allCategories: Category[];
  onSelect: (template: Template) => void;
  onClose: () => void;
}
```

行为：底部抽屉式弹窗，背景半透明遮罩，点击遮罩关闭。空列表显示 EmptyState（"暂无模板，记一笔时可将当前填写保存为模板"）。

## 文件清单

| 文件 | 操作 |
|------|------|
| `src/models/index.ts` | 新增 Template 接口 |
| `src/adapters/types.ts` | IAdapter 新增 4 个模板方法 |
| `src/adapters/dexie.ts` | 新增 templates 表 + 实现 |
| `src/hooks/useTemplates.ts` | **新建** |
| `src/components/TemplatePicker.tsx` | **新建** |
| `src/pages/AddRecord.tsx` | 新增两个按钮 + 逻辑 |
| `src/pages/Settings.tsx` | 新增模板管理区块 |
| `src/hooks/__tests__/useTemplates.test.ts` | **新建** |

## 约束

- 模板不绑定月份，全局复用
- 使用模板填充后金额仍可修改再保存
- 删除模板二次确认
- 排序逻辑与分类一致：一级和子分类各自排序 → 模板独立排序，moveUp/moveDown 只影响模板自身列表
- 模板数据进 JSON 导出/导入备份范围
