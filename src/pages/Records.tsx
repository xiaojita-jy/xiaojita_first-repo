import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatAmount, formatDateShort, getYearOptions, getMonthOptions, getDayOfWeek } from '../utils/format';
import { PAYMENT_METHODS, type PaymentMethod } from '../models';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import type { Transaction } from '../models';
import { useBudget } from '../hooks/useBudget';
import { showToast } from '../utils/toast';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

export default function Records() {
  // 年月选择
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const queryMonth = `${year}-${String(month).padStart(2, '0')}`;

  // 筛选
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
  const [filterPayment, setFilterPayment] = useState<PaymentMethod | ''>('');

  // URL 参数（日历跳转来的按日筛选）
  const [searchParams, setSearchParams] = useSearchParams();
  const filterDate = searchParams.get('date');

  // 编辑/删除
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string; type: 'expense' | 'income'; amount: string;
    categoryId: string; paymentMethod: PaymentMethod; date: string; note: string;
  } | null>(null);
  const [editError, setEditError] = useState('');

  // 数据
  const queryMonthActual = filterDate ? filterDate.slice(0, 7) : queryMonth;
  const { transactions, loading, remove, update } = useTransactions(queryMonthActual);
  const { categories, getById } = useCategories();
  const { checkAlerts } = useBudget();

  // 筛选逻辑
  const hasActiveFilters = typeFilter !== 'all' || filterCategories.size > 0 || filterPayment !== '';

  const filtered = (() => {
    let result = transactions.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
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
    if (filterDate) {
      result = result.filter(tx => tx.date === filterDate);
    }
    return result;
  })();

  const expenseTotal = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const incomeTotal = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  // 支付方式中文标签查找
  const getPaymentLabel = (method: PaymentMethod) =>
    PAYMENT_METHODS.find(p => p.value === method)?.label ?? method;

  // 操作函数
  const toggleCategory = (id: string) => {
    setFilterCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (deleteId) {
      await remove(deleteId);
      setDeleteId(null);
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditError('');
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
    if (isNaN(amountYuan) || amountYuan <= 0) {
      setEditError('请输入有效金额');
      return;
    }
    if (!editing.categoryId) {
      setEditError('请选择分类');
      return;
    }
    setEditError('');
    await update(editing.id, {
      type: editing.type,
      amount: Math.round(amountYuan * 100),
      categoryId: editing.categoryId,
      paymentMethod: editing.paymentMethod,
      date: editing.date,
      note: editing.note || undefined,
    });
    setEditing(null);

    // 预算超支检查（只对支出类编辑做检查）
    if (editing.type === 'expense') {
      try {
        const alerts = await checkAlerts(categories);
        for (const alert of alerts) {
          if (alert.level === 'danger') {
            showToast(`🔴 「${alert.categoryName}」已超支 ${formatAmount(Math.abs(alert.remaining))}`, 'danger');
          } else {
            showToast(`⚠️ 「${alert.categoryName}」预算已用 ${alert.percentage}%，剩 ${formatAmount(alert.remaining)}`, 'warning');
          }
        }
      } catch {
        // 预算检查失败不影响主流程
      }
    }
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

  // 年月下拉选项
  const yearOptions = useMemo(() => getYearOptions(), []);
  const monthOptions = useMemo(() => getMonthOptions(year), [year]);
  const handleYearChange = (y: number) => {
    setYear(y);
    const maxMonth = getMonthOptions(y).length;
    if (month > maxMonth) setMonth(maxMonth);
  };

  return (
    <div className="px-4 py-8">
      {/* === 第一行：标题 + 年月选择 === */}
      <div className="flex items-center gap-2 mb-3">
        <h1 className="text-xl font-bold text-ink">流水</h1>
        <div className="flex gap-1.5 ml-auto">
          <select
            value={year}
            onChange={e => handleYearChange(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg border border-border text-sm bg-white text-ink"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg border border-border text-sm bg-white text-ink"
          >
            {monthOptions.map(m => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
        </div>
      </div>

      {/* 日历跳转日期提示 */}
      {filterDate ? (
        <div className="flex items-center gap-2 mb-3">
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
      ) : (
        <>
          {/* === 第二行：类型切换 + 支付方式 === */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex bg-[#f0ece6] rounded-lg p-0.5">
              {(['all', 'expense', 'income'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    typeFilter === t ? 'bg-white text-ink shadow-sm' : 'text-gray-400'
                  }`}
                >
                  {t === 'all' ? '全部' : t === 'expense' ? '💰 支出' : '💵 收入'}
                </button>
              ))}
            </div>
            <select
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value as PaymentMethod | '')}
              className="px-3 py-1.5 rounded-lg border border-border text-sm bg-white text-ink ml-auto"
            >
              <option value="">全部方式</option>
              {PAYMENT_METHODS.map(pm => (
                <option key={pm.value} value={pm.value}>{pm.label}</option>
              ))}
            </select>
          </div>

          {/* === 第三行：分类标签 === */}
          <div className="flex gap-1.5 flex-wrap items-center mb-3">
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
            <span className="text-gray-300 text-xs mx-0.5">|</span>
            {categories
              .filter(c => c.type === 'income' && !c.parentId)
              .map(c => {
                const active = filterCategories.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                      active
                        ? 'bg-green-500 text-white'
                        : 'bg-[#f0ece6] text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {c.icon} {c.name}
                  </button>
                );
              })}
          </div>
        </>
      )}

      {/* === 汇总栏 === */}
      <div className="flex items-center justify-between text-sm mb-3 px-1">
        <span className="text-gray-500 text-xs">共{filtered.length}笔</span>
        <div className="flex gap-3">
          <span className="text-expense font-mono tabular-nums">支出 {formatAmount(expenseTotal)}</span>
          <span className="text-income font-mono tabular-nums">收入 {formatAmount(incomeTotal)}</span>
        </div>
      </div>

      {/* === 记录列表 === */}
      {loading ? (
        <p className="text-center text-gray-400 py-10">加载中...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          message={hasActiveFilters ? '筛选无结果，试试调整条件' : '本月无记录'}
        />
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
                    const subCat = tx.subCategoryId ? getById(tx.subCategoryId) : null;
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
                              {PAYMENT_METHODS.map(pm => (
                                <option key={pm.value} value={pm.value}>{pm.label}</option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="text"
                            value={editing.note}
                            onChange={e => setEditing({ ...editing, note: e.target.value })}
                            placeholder="备注"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                          />
                          {editError && <p className="text-red-500 text-xs text-center">{editError}</p>}
                          <div className="flex gap-2 pt-1">
                            <button onClick={handleSaveEdit} className="flex-1 py-1.5 bg-blue-500 text-white rounded text-xs font-medium">保存</button>
                            <button onClick={() => { setEditing(null); setEditError(''); }} className="flex-1 py-1.5 border border-gray-300 text-gray-600 rounded text-xs">取消</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={tx.id} className="card px-3 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg flex-shrink-0">{cat?.icon || '📌'}</span>
                          <div className="min-w-0">
                            <p className="text-sm text-ink truncate">
                              {cat?.name || '未知'}
                              {subCat && <span className="text-gray-400"> · {subCat.name}</span>}
                            </p>
                            {tx.note && <p className="text-xs text-gray-400 truncate">{tx.note}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <span className={`text-sm font-semibold font-mono tabular-nums ${tx.type === 'expense' ? 'text-expense' : 'text-income'}`}>
                                                          {formatAmount(tx.amount)}
                            </span>
                            <span className="block text-[10px] text-gray-400">{getPaymentLabel(tx.paymentMethod)}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleEdit(tx)} className="text-base leading-none opacity-40 hover:opacity-80 transition-opacity cursor-pointer" title="编辑">✏️</button>
                            <button onClick={() => setDeleteId(tx.id)} className="text-base leading-none opacity-40 hover:opacity-80 transition-opacity cursor-pointer" title="删除">🗑️</button>
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
