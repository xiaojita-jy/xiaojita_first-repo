import { DexieAdapter } from '../adapters/dexie';
import type { Transaction, Category } from '../models';
import { PAYMENT_METHODS } from '../models';

/**
 * 生成 CSV 内容字符串（纯函数，可测试）
 * 包含 UTF-8 BOM，Excel 直接打开不乱码
 */
export function generateCSVContent(
  transactions: Transaction[],
  categories: Category[]
): string {
  const catMap = new Map<string, Category>();
  categories.forEach(c => catMap.set(c.id, c));

  const paymentLabel = new Map(PAYMENT_METHODS.map(p => [p.value, p.label]));

  const typeLabel = (type: string) => (type === 'expense' ? '支出' : '收入');

  const escapeField = (s: string): string => {
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const BOM = '﻿';
  const header = '日期,类型,金额,一级分类,子分类,支付方式,备注';

  const rows = transactions.map(tx => {
    const cat = catMap.get(tx.categoryId);
    // 如果分类是子分类，parentCat 是它的一级分类名，subCat 是子分类名
    // 如果分类是一级分类，parentCat 就是它自己，subCat 为空
    const isSub = cat?.parentId != null;
    const parentCat = isSub ? catMap.get(cat!.parentId!) : cat;

    const fields = [
      tx.date,
      typeLabel(tx.type),
      (tx.amount / 100).toFixed(2),
      parentCat?.name ?? '',
      isSub ? (cat?.name ?? '') : '',
      paymentLabel.get(tx.paymentMethod) ?? tx.paymentMethod,
      tx.note ?? '',
    ];

    return fields.map(escapeField).join(',');
  });

  return BOM + header + '\n' + rows.join('\n');
}

/**
 * 导出 CSV 文件 — 获取全部数据 → 生成 CSV → 触发下载
 */
export async function exportCSV(): Promise<void> {
  const [transactions, categories] = await Promise.all([
    DexieAdapter.getAllTransactions(),
    DexieAdapter.getAllCategories(),
  ]);

  // 按日期排序（最新在前）
  transactions.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  const content = generateCSVContent(transactions, categories);

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `keep-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
