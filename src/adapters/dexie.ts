import Dexie, { type Table } from 'dexie';
import type { Transaction, Category, Budget, Template } from '../models';
import type { IAdapter } from './types';

class KeepAccountsDB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  settings!: Table<{ key: string; value: string }, string>;
  templates!: Table<Template, string>;

  constructor() {
    super('KeepAccountsDB');
    this.version(2).stores({
      transactions: 'id, date, categoryId, type, amount',
      categories: 'id, type, parentId, order',
      budgets: 'id, [month+categoryId]',
      settings: 'key',
    }).upgrade(async tx => {
      // v1→v2: 新增 order 索引，清空旧分类数据后重新播种
      await tx.table('categories').clear();
    });
    this.version(3).stores({
      transactions: 'id, date, categoryId, type, amount',
      categories: 'id, type, parentId, order',
      budgets: 'id, [month+categoryId]',
      settings: 'key',
      templates: 'id, order',
    });
  }
}

const db = new KeepAccountsDB();

export const DexieAdapter: IAdapter = {
  // —— Transactions ——
  async getAllTransactions() {
    return db.transactions.orderBy('date').reverse().toArray();
  },

  async getTransactionsByMonth(month: string) {
    return db.transactions
      .where('date')
      .startsWith(month)
      .reverse()
      .sortBy('date');
  },

  async getTransactionsByCategory(categoryId: string, month?: string) {
    let collection = db.transactions.where('categoryId').equals(categoryId);
    if (month) {
      collection = collection.filter(tx => tx.date.startsWith(month));
    }
    return collection.reverse().sortBy('date');
  },

  async addTransaction(tx: Transaction) {
    await db.transactions.add(tx);
  },

  async updateTransaction(id: string, data: Partial<Transaction>) {
    await db.transactions.update(id, { ...data, updatedAt: Date.now() });
  },

  async deleteTransaction(id: string) {
    await db.transactions.delete(id);
  },

  // —— Categories ——
  async getAllCategories() {
    return db.categories.orderBy('order').toArray();
  },

  async getCategoriesByType(type: 'expense' | 'income') {
    return db.categories.where('type').equals(type).sortBy('order');
  },

  async getSubCategories(parentId: string) {
    return db.categories.where('parentId').equals(parentId).sortBy('order');
  },

  async addCategory(cat: Category) {
    await db.categories.add(cat);
  },

  async updateCategory(id: string, data: Partial<Category>) {
    await db.categories.update(id, data);
  },

  async deleteCategory(id: string) {
    await db.categories.delete(id);
  },

  async getTransactionCountByCategory(categoryId: string) {
    return db.transactions.where('categoryId').equals(categoryId).count();
  },

  // —— Budgets ——
  async getBudget(month: string, categoryId?: string) {
    const keyCategoryId = categoryId ?? '__total__';
    return db.budgets.where({ month, categoryId: keyCategoryId }).first();
  },

  async getAllBudgets(month: string) {
    return db.budgets.where('month').equals(month).toArray();
  },

  async setBudget(budget: Budget) {
    const keyCategoryId = budget.categoryId ?? '__total__';
    const existing = await db.budgets
      .where('[month+categoryId]')
      .equals([budget.month, keyCategoryId])
      .first();
    if (existing) {
      await db.budgets.update(existing.id, { amount: budget.amount });
    } else {
      await db.budgets.add({ ...budget, categoryId: keyCategoryId });
    }
  },

  async deleteBudget(id: string) {
    await db.budgets.delete(id);
  },

  async deleteBudgetsByCategory(categoryId: string) {
    const targets = await db.budgets.where('categoryId').equals(categoryId).toArray();
    await db.budgets.bulkDelete(targets.map(b => b.id));
  },

  async getBudgetsInRange(startMonth: string, endMonth: string) {
    return db.budgets.where('month').between(startMonth, endMonth, true, true).toArray();
  },

  // —— Templates ——
  async getAllTemplates() {
    return db.templates.orderBy('order').toArray();
  },

  async addTemplate(t: Template) {
    await db.templates.add(t);
  },

  async updateTemplate(id: string, data: Partial<Template>) {
    await db.templates.update(id, data);
  },

  async deleteTemplate(id: string) {
    await db.templates.delete(id);
  },

  // —— Settings ——
  async getSetting(key: string) {
    const row = await db.settings.get(key);
    return row?.value ?? null;
  },

  async setSetting(key: string, value: string) {
    await db.settings.put({ key, value });
  },

  // —— Lifecycle ——
  async seedDefaultCategories(categories: Category[]) {
    const count = await db.categories.count();
    if (count === 0) {
      await db.categories.bulkAdd(categories);
    }
  },
};

// 导出 db 实例供备份模块使用
export { db };
