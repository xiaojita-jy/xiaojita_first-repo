import type { Transaction, Category, Budget } from '../models';

export interface IAdapter {
  // —— Transactions ——
  getAllTransactions(): Promise<Transaction[]>;
  getTransactionsByMonth(month: string): Promise<Transaction[]>;
  getTransactionsByCategory(categoryId: string, month?: string): Promise<Transaction[]>;
  addTransaction(tx: Transaction): Promise<void>;
  updateTransaction(id: string, data: Partial<Transaction>): Promise<void>;
  deleteTransaction(id: string): Promise<void>;

  // —— Categories ——
  getAllCategories(): Promise<Category[]>;
  getCategoriesByType(type: 'expense' | 'income'): Promise<Category[]>;
  getSubCategories(parentId: string): Promise<Category[]>;
  addCategory(cat: Category): Promise<void>;
  updateCategory(id: string, data: Partial<Category>): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  getTransactionCountByCategory(categoryId: string): Promise<number>;

  // —— Budgets ——
  getBudget(month: string, categoryId?: string): Promise<Budget | undefined>;
  getAllBudgets(month: string): Promise<Budget[]>;
  setBudget(budget: Budget): Promise<void>;
  deleteBudget(id: string): Promise<void>;

  // —— Settings ——
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;

  // —— Lifecycle ——
  seedDefaultCategories(categories: Category[]): Promise<void>;
}
