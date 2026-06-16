import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { useBudget } from '../hooks/useBudget';
import { useReports } from '../hooks/useReports';
import { formatAmount, getCurrentMonth } from '../utils/format';
import type { Anomaly } from '../hooks/useReports';
import EmptyState from '../components/EmptyState';

export default function Dashboard() {
  const navigate = useNavigate();
  const currentMonth = getCurrentMonth();
  const { transactions, totals, loading } = useTransactions(currentMonth);
  const { calculateProgress } = useBudget();
  const { getAnomalies } = useReports();

  const [budgetProgress, setBudgetProgress] = useState<{ budget: number; spent: number; remaining: number; percentage: number } | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [showBackupReminder, setShowBackupReminder] = useState(false);

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
    return <div className="px-4 py-6 text-center text-gray-400">加载中...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-lg font-semibold text-gray-800 mb-2">概览</h1>
        <EmptyState
          icon="📝"
          message="还没有记账，开始第一笔吧"
          action={{ label: '➕ 记一笔', onClick: () => navigate('/add') }}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">概览</h1>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-gray-500">本月支出</p>
          <p className="text-lg font-bold text-red-500 mt-1">{formatAmount(totals.expense)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-gray-500">本月收入</p>
          <p className="text-lg font-bold text-green-500 mt-1">{formatAmount(totals.income)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-gray-500">月度结余</p>
          <p className={`text-lg font-bold mt-1 ${totals.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
            {formatAmount(totals.balance)}
          </p>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
          <p className="text-sm font-medium text-yellow-800">异常提醒</p>
          {anomalies.map(a => (
            <p key={a.categoryId} className="text-xs text-yellow-700 mt-1">
              「{a.categoryName}」本月已花 {formatAmount(a.currentAmount)}，较前3月均值增长 {a.deviation}%
            </p>
          ))}
        </div>
      )}

      {showBackupReminder && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-blue-700">已超过7天未备份，建议立即备份数据</p>
          <button
            onClick={() => navigate('/settings')}
            className="text-xs px-3 py-1 bg-blue-500 text-white rounded-lg"
          >
            去备份
          </button>
        </div>
      )}

      {budgetProgress && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">月度预算</span>
            <span className="text-gray-800 font-medium">
              {formatAmount(budgetProgress.spent)} / {formatAmount(budgetProgress.budget)}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetProgress.percentage > 100 ? 'bg-red-500' : budgetProgress.percentage > 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(budgetProgress.percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {budgetProgress.remaining > 0
              ? `剩余 ${formatAmount(budgetProgress.remaining)}`
              : `已超支 ${formatAmount(Math.abs(budgetProgress.remaining))}`}
          </p>
        </div>
      )}

      <button
        onClick={() => navigate('/add')}
        className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium text-sm active:bg-blue-600"
      >
        ➕ 记一笔
      </button>
    </div>
  );
}
