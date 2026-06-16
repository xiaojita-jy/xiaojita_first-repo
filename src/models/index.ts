// ========== 枚举类型 ==========

export type PaymentMethod = 'wechat' | 'alipay' | 'bank_card' | 'credit_card' | 'cash' | 'other';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'wechat', label: '微信' },
  { value: 'alipay', label: '支付宝' },
  { value: 'bank_card', label: '银行卡' },
  { value: 'credit_card', label: '信用卡' },
  { value: 'cash', label: '现金' },
  { value: 'other', label: '其他' },
];

// ========== 数据模型 ==========

export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;            // 单位：分
  categoryId: string;
  subCategoryId?: string;
  paymentMethod: PaymentMethod;
  date: string;              // YYYY-MM-DD
  note?: string;
  createdAt: number;         // Unix timestamp (ms)
  updatedAt?: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  order: number;
  parentId?: string;
}

export interface Budget {
  id: string;
  categoryId?: string;       // undefined = 总预算
  month: string;             // YYYY-MM
  amount: number;            // 单位：分
}

// ========== 默认分类 ==========

let _catId = 0;
const cid = () => `cat_${++_catId}`;

export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: cid(), name: '餐饮', type: 'expense', icon: '🍜', order: 1 },
  { id: cid(), name: '居住', type: 'expense', icon: '🏠', order: 2 },
  { id: cid(), name: '交通', type: 'expense', icon: '🚗', order: 3 },
  { id: cid(), name: '购物', type: 'expense', icon: '🛒', order: 4 },
  { id: cid(), name: '悦己', type: 'expense', icon: '🎯', order: 5 },
  { id: cid(), name: '人情', type: 'expense', icon: '🎁', order: 6 },
  { id: cid(), name: '医教', type: 'expense', icon: '💊', order: 7 },
  { id: cid(), name: '其他', type: 'expense', icon: '📌', order: 8 },
];

export const DEFAULT_EXPENSE_SUB_CATEGORIES: Category[] = [
  // 餐饮 二级
  { id: cid(), name: '外卖', type: 'expense', icon: '🥡', order: 1, parentId: DEFAULT_EXPENSE_CATEGORIES[0].id },
  { id: cid(), name: '外食', type: 'expense', icon: '🍽️', order: 2, parentId: DEFAULT_EXPENSE_CATEGORIES[0].id },
  { id: cid(), name: '买菜', type: 'expense', icon: '🥬', order: 3, parentId: DEFAULT_EXPENSE_CATEGORIES[0].id },
  { id: cid(), name: '零食饮料', type: 'expense', icon: '🧋', order: 4, parentId: DEFAULT_EXPENSE_CATEGORIES[0].id },
  { id: cid(), name: '聚餐', type: 'expense', icon: '🥘', order: 5, parentId: DEFAULT_EXPENSE_CATEGORIES[0].id },
  // 交通 二级
  { id: cid(), name: '通勤', type: 'expense', icon: '🚇', order: 1, parentId: DEFAULT_EXPENSE_CATEGORIES[2].id },
  { id: cid(), name: '打车', type: 'expense', icon: '🚕', order: 2, parentId: DEFAULT_EXPENSE_CATEGORIES[2].id },
  { id: cid(), name: '停车', type: 'expense', icon: '🅿️', order: 3, parentId: DEFAULT_EXPENSE_CATEGORIES[2].id },
  { id: cid(), name: '养车', type: 'expense', icon: '🔧', order: 4, parentId: DEFAULT_EXPENSE_CATEGORIES[2].id },
  // 购物 二级
  { id: cid(), name: '服饰鞋包', type: 'expense', icon: '👗', order: 1, parentId: DEFAULT_EXPENSE_CATEGORIES[3].id },
  { id: cid(), name: '数码电子', type: 'expense', icon: '📱', order: 2, parentId: DEFAULT_EXPENSE_CATEGORIES[3].id },
  { id: cid(), name: '美妆个护', type: 'expense', icon: '💄', order: 3, parentId: DEFAULT_EXPENSE_CATEGORIES[3].id },
  { id: cid(), name: '家居日用', type: 'expense', icon: '🏪', order: 4, parentId: DEFAULT_EXPENSE_CATEGORIES[3].id },
  { id: cid(), name: '冲动消费⚠️', type: 'expense', icon: '⚡', order: 5, parentId: DEFAULT_EXPENSE_CATEGORIES[3].id },
  { id: cid(), name: '其他购物', type: 'expense', icon: '📦', order: 6, parentId: DEFAULT_EXPENSE_CATEGORIES[3].id },
];

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { id: cid(), name: '工资', type: 'income', icon: '💰', order: 1 },
  { id: cid(), name: '副业', type: 'income', icon: '💼', order: 2 },
  { id: cid(), name: '其他收入', type: 'income', icon: '📥', order: 3 },
];

export const ALL_DEFAULT_CATEGORIES: Category[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_EXPENSE_SUB_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];