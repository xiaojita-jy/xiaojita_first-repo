import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatAmount, formatDateShort, getCurrentMonth, getDayOfWeek } from '../utils/format';
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
  const [editing, setEditing] = useState<{
    id: string; type: 'expense' | 'income'; amount: string;
    categoryId: string; paymentMethod: PaymentMethod; date: string; note: string;
  } | null>(null);

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
    setEditing({
      id: tx.id,
      type: tx.type,
      amount: (tx.amount / 100).toFixed(2),
      categoryId: tx.categoryId,
      paymentMethod: tx.paymentMethod,
      date: tx.date,
      note: tx.note || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const amountYuan = parseFloat(editing.amount);
    if (isNaN(amountYuan) || amountYuan <= 0) return;
    await update(editing.id, {
      amount: Math.round(amountYuan * 100),
      categoryId: editing.categoryId,
      paymentMethod: editing.paymentMethod,
      date: editing.date,
      note: editing.note || undefined,
    });
    setEditing(null);
  };

  // 按日期分组
  const grouped = (() => {
    const map = new Map<string, Transaction[]>();
    filtered.forEach(tx => {
      const list = map.get(tx.date) || [];
      list.push(tx);
      map.set(tx.date, list);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  })();

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
        <div className="space-y-4">
          {grouped.map(([date, txs]) => {
            const dayExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const dayIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            return (
              <div key={date}>
                {/* 日期标题行 */}
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {formatDateShort(date)} {getDayOfWeek(date)}
                  </span>
                  <div className="flex gap-3 text-xs">
                    {dayExpense > 0 && <span className="text-red-500">支出 {formatAmount(dayExpense)}</span>}
                    {dayIncome > 0 && <span className="text-green-500">收入 {formatAmount(dayIncome)}</span>}
                  </div>
                </div>
                {/* 当日交易列表 */}
                <div className="space-y-1.5">
                  {txs.map(tx => {
                    const cat = getById(tx.categoryId);
                    const isEditing = editing?.id === tx.id;
                    return isEditing ? (
                      <div key={tx.id} className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text" inputMode="decimal"
                              value={editing.amount}
                              onChange={e => setEditing({ ...editing, amount: e.target.value })}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                              placeholder="金额"
                            />
                            <input
                              type="date"
                              value={editing.date}
                              onChange={e => setEditing({ ...editing, date: e.target.value })}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={editing.categoryId}
                              onChange={e => setEditing({ ...editing, categoryId: e.target.value })}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm bg-white"
                            >
                              {categories
                                .filter(c => c.type === editing.type)
                                .map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}{c.parentId ? ' (子)' : ''}</option>)}
                            </select>
                            <select
                              value={editing.paymentMethod}
                              onChange={e => setEditing({ ...editing, paymentMethod: e.target.value as PaymentMethod })}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm bg-white"
                            >
                              <option value="wechat">微信</option>
                              <option value="alipay">支付宝</option>
                              <option value="bank_card">银行卡</option>
                              <option value="credit_card">信用卡</option>
                              <option value="cash">现金</option>
                              <option value="other">其他</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            value={editing.note}
                            onChange={e => setEditing({ ...editing, note: e.target.value })}
                            placeholder="备注"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                          />
                          <div className="flex gap-2 pt-1">
                            <button onClick={handleSaveEdit} className="flex-1 py-1.5 bg-blue-500 text-white rounded text-xs font-medium">保存</button>
                            <button onClick={() => setEditing(null)} className="flex-1 py-1.5 border border-gray-300 text-gray-600 rounded text-xs">取消</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={tx.id} className="bg-white rounded-lg px-3 py-2 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cat?.icon || '📌'}</span>
                          <div>
                            <p className="text-sm text-gray-800">{cat?.name || '未知'}</p>
                            {tx.note && <p className="text-xs text-gray-400">{tx.note}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                            {tx.type === 'expense' ? '-' : '+'}{formatAmount(tx.amount)}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => handleEdit(tx)} className="text-xs text-gray-400 leading-none">编辑</button>
                            <button onClick={() => setDeleteId(tx.id)} className="text-xs text-gray-400 leading-none">删除</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
