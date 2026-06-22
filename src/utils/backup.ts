import { DexieAdapter, db } from '../adapters/dexie';

interface BackupData {
  version: number;
  exportedAt: string;
  transactions: any[];
  categories: any[];
  budgets: any[];
  templates: any[];
}

async function collectAllBudgets(): Promise<any[]> {
  const all: any[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const budgets = await db.budgets.where('month').equals(month).toArray();
    all.push(...budgets);
  }
  return all;
}

export async function exportBackup(): Promise<void> {
  const [transactions, categories, budgets, templates] = await Promise.all([
    DexieAdapter.getAllTransactions(),
    DexieAdapter.getAllCategories(),
    collectAllBudgets(),
    DexieAdapter.getAllTemplates(),
  ]);

  const backup: BackupData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    budgets,
    templates,
  };

  localStorage.setItem('keep_accounts_last_backup', new Date().toISOString());

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `keep-accounts-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBackup(): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return reject(new Error('未选择文件'));

      try {
        const text = await file.text();
        const data: BackupData = JSON.parse(text);

        if (data.version !== 1 && data.version !== 2) throw new Error('备份文件版本不兼容');
        if (!Array.isArray(data.transactions)) throw new Error('备份文件格式错误：缺少交易数据');
        if (!Array.isArray(data.categories)) throw new Error('备份文件格式错误：缺少分类数据');

        // 清空现有数据再导入
        await db.transactions.clear();
        await db.categories.clear();
        await db.budgets.clear();
        await db.templates.clear();

        for (const cat of data.categories) {
          await DexieAdapter.addCategory(cat);
        }
        for (const tx of data.transactions) {
          await DexieAdapter.addTransaction(tx);
        }
        if (Array.isArray(data.budgets)) {
          for (const budget of data.budgets) {
            await DexieAdapter.setBudget(budget);
          }
        }
        // v2 支持模板导入
        if (Array.isArray(data.templates)) {
          for (const tpl of data.templates) {
            await DexieAdapter.addTemplate(tpl);
          }
        }
        resolve();
      } catch (e: any) {
        reject(new Error(e.message || '备份文件无效'));
      }
    };
    input.click();
  });
}
