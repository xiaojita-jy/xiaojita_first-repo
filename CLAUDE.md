# Keep Accounts — 个人记账 PWA 应用

## 项目约定

### 技术栈
React 18 + TypeScript (strict) + Vite + TailwindCSS 3 + React Router v6 + Dexie.js + Recharts + vite-plugin-pwa

### 目录结构
- `src/models/` — TypeScript 类型定义和常量数据，纯数据不依赖框架
- `src/adapters/` — 数据存取层，`types.ts` 定义 IAdapter 接口，`dexie.ts` 实现
- `src/hooks/` — 自定义 React Hooks，封装业务逻辑，页面只通过 hooks 访问数据
- `src/components/` — 通用 UI 组件，无业务逻辑
- `src/pages/` — 页面组件，每个文件一个页面
- `src/utils/` — 纯函数工具

### 数据流
pages → hooks → adapters → IndexedDB (Dexie.js)
页面不直接调用 adapter，必须通过 hooks。

### 命名约定
- 组件文件：PascalCase（如 `AmountInput.tsx`）
- Hook 文件：camelCase with `use` 前缀（如 `useTransactions.ts`）
- 工具/模型文件：camelCase（如 `format.ts`）
- 接口命名：`IAdapter`（接口前缀 I），类型用 PascalCase
- 金额统一用**分（整数）**存储和计算，展示时才转为元

### 约束
- MVP 不做 OCR、语音、周期交易、云同步、多用户
- 纯本地存储，备份通过 JSON 文件导出/导入
- 所有文案中文
- 删除操作一律二次确认
