import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatAmount, formatDateShort, getCurrentMonth } from '../utils/format';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import type { Transaction, PaymentMethod } from '../models';

const MONTHS = (() => {
  const now = new Date();
  const ms = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    ms.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return ms;
})();

export default function Records() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayment, setFilterPayment] = useState<PaymentMethod | ''>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');

  const { transactions, loading, remove, update } = useTransactions(month);
  const { categories, getById } = useCategories();

  const filtered = transactions.filter(tx => {
    if (filterCategory && tx.categoryId !== filterCategory) {
      const cat = getById(tx.categoryId);
      if (!cat || cat.parentId !== filterCategory) return false;
    }
    if (filterPayment && tx.paymentMethod !== filterPayment) return false;
    return true;
  });

  const expenseTotal = filtered
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const incomeTotal = filtered
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const handleDelete = async () => {
    if (deleteId) {
      await remove(deleteId);
      setDeleteId(null);
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditNote(tx.note || '');
  };

  const handleSaveEdit = async (id: string) => {
    await update(id, { note: editNote });
    setEditingId(null);
    setEditNote('');
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">流水</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
        >
          {MONTHS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="">全部分类</option>
          {categories
            .filter(c => !c.parentId && c.type === 'expense')
            .map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
        </select>
        <select
          value={filterPayment}
          onChange={e => setFilterPayment(e.target.value as PaymentMethod | '')}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="">全部方式</option>
          <option value="wechat">微信</option>
          <option value="alipay">支付宝</option>
          <option value="bank_card">银行卡</option>
          <option value="credit_card">信用卡</option>
          <option value="cash">现金</option>
          <option value="other">其他</option>
        </select>
      </div>

      <div className="flex justify-between text-sm mb-3 px-1">
        <span className="text-red-500">支出 {formatAmount(expenseTotal)}</span>
        <span className="text-green-500">收入 {formatAmount(incomeTotal)}</span>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-10">加载中...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📋" message="本月无记录" />
      ) : (
        <div className="space-y-2">
          {filtered.map(tx => {
            const cat = getById(tx.categoryId);
            const isEditing = editingId === tx.id;
            return (
              <div key={tx.id} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat?.icon || '📌'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{cat?.name || '未知'}</p>
                      {isEditing ? (
                        <div className="flex gap-1 mt-1">
                          <input
                            type="text"
                            value={editNote}
                            onChange={e => setEditNote(e.target.value)}
                            className="px-2 py-0.5 border border-gray-200 rounded text-xs flex-1"
                            autoFocus
                          />
                          <button onClick={() => handleSaveEdit(tx.id)} className="text-xs text-blue-500 px-1">保存</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 px-1">取消</button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">
                          {formatDateShort(tx.date)}
                          {tx.note ? ` · ${tx.note}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                      {tx.type === 'expense' ? '-' : '+'}{formatAmount(tx.amount)}
                    </span>
                    {!isEditing && (
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleEdit(tx)} className="text-xs text-gray-400">编辑</button>
                        <button onClick={() => setDeleteId(tx.id)} className="text-xs text-gray-400">删除</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="删除记录"
        message="删除后不可恢复，确定要删除吗？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
