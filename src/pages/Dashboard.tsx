import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { useBudget } from '../hooks/useBudget';
import { useReports } from '../hooks/useReports';
import { useCategories } from '../hooks/useCategories';
import { formatAmount, getCurrentMonth, getWeekRange } from '../utils/format';
import type { Anomaly } from '../hooks/useReports';
import type { BudgetAlert } from '../models';
import EmptyState from '../components/EmptyState';

export default function Dashboard() {
  const navigate = useNavigate();
  const currentMonth = getCurrentMonth();
  const { transactions, totals, loading, byCategory } = useTransactions(currentMonth);
  const { budgets, calculateProgress, checkAlerts } = useBudget();
  const { getAnomalies } = useReports();
  const { getById, categories } = useCategories();

  const [budgetProgress, setBudgetProgress] = useState<{ budget: number; spent: number; remaining: number; percentage: number } | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);

  useEffect(() => {
    checkAlerts(categories).then(setBudgetAlerts).catch(() => {});
  }, [checkAlerts, categories, transactions]);

  useEffect(() => {
    calculateProgress().then(setBudgetProgress);
  }, [calculateProgress, transactions]);

  useEffect(() => {
    getAnomalies(currentMonth).then(setAnomalies);
  }, [getAnomalies, currentMonth, transactions]);

  useEffect(() => {
    const lastBackup = localStorage.getItem('keep_accounts_last_backup');
    if (!lastBackup) {
      setShowBackupReminder(true);
      return;
    }
    const lastDate = new Date(lastBackup);
    const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) setShowBackupReminder(true);
  }, []);

  if (loading) {
    return <div className="px-5 pt-7 pb-8 text-center text-slate-500">加载中...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="px-5 pt-7 pb-8">
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-2">概览</h1>
        <EmptyState
          icon="📝"
          message="还没有记账，开始第一笔吧"
          action={{ label: '➕ 记一笔', onClick: () => navigate('/add') }}
        />
      </div>
    );
  }

  return (
    <div className="px-5 pt-7 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight">概览</h1>
        <span className="text-xs text-slate-500 font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(71,85,105,0.2)' }}>{currentMonth.replace('-', '年')}月</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-[18px]">
        <div className="card p-4 text-center">
          <p className="text-[10.5px] text-slate-500 uppercase tracking-wider font-medium mb-1">本月支出</p>
          <p className="text-[22px] font-bold text-expense tabular-nums">{formatAmount(totals.expense)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[10.5px] text-slate-500 uppercase tracking-wider font-medium mb-1">本月收入</p>
          <p className="text-[22px] font-bold text-income tabular-nums">{formatAmount(totals.income)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[10.5px] text-slate-500 uppercase tracking-wider font-medium mb-1">月度结余</p>
          <p className={`text-[22px] font-bold tabular-nums ${
            totals.balance > 0 ? 'text-income' : totals.balance < 0 ? 'text-expense' : 'text-ink'
          }`}>
            {formatAmount(totals.balance)}
          </p>
        </div>
      </div>

      {budgetAlerts.length > 0 && (
        <div className={`rounded-xl p-4 mb-3 ${
          budgetAlerts.some(a => a.level === 'danger')
            ? 'bg-red-950/20 border border-red-800/40'
            : 'bg-amber-950/20 border border-amber-800/40'
        }`}>
          <p className={`text-sm font-medium mb-2 ${
            budgetAlerts.some(a => a.level === 'danger') ? 'text-red-300' : 'text-amber-300'
          }`}>
            {budgetAlerts.some(a => a.level === 'danger') ? '🔴 预算超支提醒' : '⚠️ 预算预警'}
          </p>
          {budgetAlerts.map(a => (
            <p key={a.categoryId ?? '__total__'} className={`text-xs mt-1 ${
              a.level === 'danger' ? 'text-red-400' : 'text-amber-400'
            }`}>
              {a.categoryIcon} {a.categoryName}：
              {a.level === 'danger'
                ? `已超支 ${formatAmount(Math.abs(a.remaining), { minOne: true })}`
                : `已用 ${a.percentage}%，剩 ${formatAmount(a.remaining, { minOne: true })}`}
            </p>
          ))}
        </div>
      )}

      {/* 本周概览 */}
      {(() => {
        const week = getWeekRange();
        const weekTxs = transactions.filter(tx => week.days.includes(tx.date));
        const weekExpense = weekTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const weekIncome = weekTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const weekDays = week.days.length;
        if (weekTxs.length === 0) return null;
        return (
          <div className="card p-4 mb-3">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">本周概览</h3>
            <div className="flex justify-around text-center">
              <div>
                <p className="text-[10.5px] text-slate-500 font-medium mb-1.5">本周支出</p>
                <p className="text-xl font-bold text-expense tabular-nums">{formatAmount(weekExpense)}</p>
              </div>
              <div className="w-px" style={{ background: 'rgba(71,85,105,0.2)' }} />
              <div>
                <p className="text-[10.5px] text-slate-500 font-medium mb-1.5">本周收入</p>
                <p className="text-xl font-bold text-income tabular-nums">{formatAmount(weekIncome)}</p>
              </div>
              <div className="w-px" style={{ background: 'rgba(71,85,105,0.2)' }} />
              <div>
                <p className="text-[10.5px] text-slate-500 font-medium mb-1.5">日均支出</p>
                <p className="text-xl font-bold text-expense tabular-nums">{formatAmount(Math.round(weekExpense / weekDays))}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {anomalies.length > 0 && (
        <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-xl p-3 mb-3">
          <p className="text-sm font-medium text-yellow-200">异常提醒</p>
          {anomalies.map(a => (
            <p key={a.categoryId} className="text-xs text-yellow-300 mt-1">
              「{a.categoryName}」本月已花 {formatAmount(a.currentAmount, { minOne: true })}，较前3月均值增长 {a.deviation}%
            </p>
          ))}
        </div>
      )}

      {showBackupReminder && (
        <div className="bg-sky-950/30 border border-sky-800/40 rounded-xl p-3 mb-3 flex items-center justify-between">
          <p className="text-sm text-sky-300">已超过7天未备份，建议立即备份数据</p>
          <button
            onClick={() => navigate('/settings')}
            className="text-xs px-3 py-1 rounded-lg text-white font-medium"
            style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
          >
            去备份
          </button>
        </div>
      )}

      {budgetProgress && (
        <div className="card p-4 mb-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-xs text-slate-500">月度预算</span>
            <span className="text-slate-200 font-medium text-xs">
              已用 {budgetProgress.percentage}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(71,85,105,0.25)' }}>
            <div
              className={`h-full rounded-full transition-all ${
                budgetProgress.percentage > 100 ? 'bg-red-500' : budgetProgress.percentage > 80 ? 'bg-amber-500' : ''
              }`}
              style={{
                width: `${Math.min(budgetProgress.percentage, 100)}%`,
                ...(budgetProgress.percentage > 80 ? {} : { background: 'linear-gradient(90deg, #0284c7, #38bdf8)' })
              }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {budgetProgress.remaining > 0
              ? `剩余 ${formatAmount(budgetProgress.remaining)}`
              : `已超支 ${formatAmount(Math.abs(budgetProgress.remaining))}`}
          </p>
        </div>
      )}

      {budgets.filter(b => b.categoryId && b.categoryId !== '__total__').length > 0 && (
        <div className="card p-4 mb-3">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">分类预算</h3>
          {budgets.filter(b => b.categoryId && b.categoryId !== '__total__').map(b => {
            const cat = getById(b.categoryId!);
            // 包含子分类的支出汇总
            let spent = byCategory.get(b.categoryId!) || 0;
            categories.filter(c => c.parentId === b.categoryId).forEach(sub => {
              spent += byCategory.get(sub.id) || 0;
            });
            const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
            return (
              <div key={b.id} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs mb-1">
                  <span>
                    {cat?.color && (
                      <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: cat.color }} />
                    )}
                    {cat?.icon} {cat?.name || '未知'}
                  </span>
                  <span className="text-xs tabular-nums">
                    <span className="text-expense">{formatAmount(spent)}</span>
                    <span className="text-slate-500 mx-0.5">|</span>
                    <span className="text-amber-500">{formatAmount(b.amount)}</span>
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(71,85,105,0.25)' }}>
                  <div
                    className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : ''}`}
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      ...(pct > 80 ? {} : { background: 'linear-gradient(90deg, #0284c7, #38bdf8)' })
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate('/add')}
        className="btn-primary"
      >
        ➕ 记一笔
      </button>
    </div>
  );
}
