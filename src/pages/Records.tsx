import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
  const [filterPayment, setFilterPayment] = useState<PaymentMethod | ''>('');

  const [searchParams, setSearchParams] = useSearchParams();
  const filterDate = searchParams.get('date');

  const toggleCategory = (id: string) => {
    setFilterCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string; type: 'expense' | 'income'; amount: string;
    categoryId: string; paymentMethod: PaymentMethod; date: string; note: string;
  } | null>(null);

  const queryMonth = filterDate ? filterDate.slice(0, 7) : month;
  const { transactions, loading, remove, update } = useTransactions(queryMonth);
  const { categories, getById } = useCategories();

  const filtered = (() => {
    let result = transactions.filter(tx => {
      if (filterCategories.size > 0) {
        const cat = getById(tx.categoryId);
        const parentId = cat?.parentId ?? tx.categoryId;
        if (!filterCategories.has(tx.categoryId) && !filterCategories.has(parentId)) {
          return false;
        }
      }
      if (filterPayment && tx.paymentMethod !== filterPayment) return false;
      return true;
    });
    // 按日筛选
    if (filterDate) {
      result = result.filter(tx => tx.date === filterDate);
    }
    return result;
  })();

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
    if (!editing.categoryId) return;
    await update(editing.id, {
      type: editing.type,
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
    <div className="px-4 py-8">
      <h1 className="text-xl font-bold text-ink mb-6">流水</h1>

      {filterDate ? (
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm font-medium text-ink ml-auto">
            {formatDateShort(filterDate)} {getDayOfWeek(filterDate)}
          </span>
          <button
            onClick={() => setSearchParams({})}
            className="text-xs text-blue-500 cursor-pointer"
          >
            ← 返回整月
          </button>
        </div>
      ) : null}

      {!filterDate && (
        <div className="flex gap-2 mb-5 flex-wrap">
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border text-sm bg-white text-ink"
        >
          {MONTHS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {/* 分类多选标签 */}
        <div className="flex gap-1.5 flex-wrap">
          {categories
            .filter(c => !c.parentId && c.type === 'expense')
            .map(c => {
              const active = filterCategories.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCategory(c.id)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-500 text-white'
                      : 'bg-[#f0ece6] text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {c.icon} {c.name}
                </button>
              );
            })}
        </div>
        <select
          value={filterPayment}
          onChange={e => setFilterPayment(e.target.value as PaymentMethod | '')}
          className="px-3 py-1.5 rounded-lg border border-border text-sm bg-white text-ink"
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
      )}

      <div className="flex justify-between text-sm mb-3 px-1">
        <span className="text-expense font-mono tabular-nums">支出 {formatAmount(expenseTotal)}</span>
        <span className="text-income font-mono tabular-nums">收入 {formatAmount(incomeTotal)}</span>
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
                  <span className="text-sm font-semibold text-ink">
                    {formatDateShort(date)} {getDayOfWeek(date)}
                  </span>
                  <div className="flex gap-3 text-xs">
                    {dayExpense > 0 && <span className="text-expense font-mono tabular-nums">支出 {formatAmount(dayExpense)}</span>}
                    {dayIncome > 0 && <span className="text-income font-mono tabular-nums">收入 {formatAmount(dayIncome)}</span>}
                  </div>
                </div>
                {/* 当日交易列表 */}
                <div className="space-y-1.5">
                  {txs.map(tx => {
                    const cat = getById(tx.categoryId);
                    const isEditing = editing?.id === tx.id;
                    return isEditing ? (
                      <div key={tx.id} className="bg-blue-50/50 rounded-xl p-3 border border-blue-200">
                        <div className="space-y-2">
                          <div className="flex bg-gray-100 rounded-lg p-1">
                            {(['expense', 'income'] as const).map(t => (
                              <button
                                key={t}
                                onClick={() => setEditing({ ...editing, type: t, categoryId: '' })}
                                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                  editing.type === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                                }`}
                              >
                                {t === 'expense' ? '💰 支出' : '💵 收入'}
                              </button>
                            ))}
                          </div>
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
                              <option value="" disabled>请选择分类</option>
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
                      <div key={tx.id} className="card px-3 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cat?.icon || '📌'}</span>
                          <div>
                            <p className="text-sm text-ink">{cat?.name || '未知'}</p>
                            {tx.note && <p className="text-xs text-gray-400">{tx.note}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold font-mono tabular-nums ${tx.type === 'expense' ? 'text-expense' : 'text-income'}`}>
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
