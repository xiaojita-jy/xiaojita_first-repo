import { useEffect, useState, Suspense, lazy } from 'react';
import { useReports, type CategorySummary, type Anomaly } from '../hooks/useReports';
import { formatAmount, getCurrentMonth, getPastMonths, formatMonth } from '../utils/format';
import type { Transaction } from '../models';

const Charts = lazy(() => import('../components/Charts'));

function ChartFallback() {
  return (
    <div className="card p-4 mb-4">
      <p className="text-center text-gray-400 py-10 text-sm">图表加载中...</p>
    </div>
  );
}

export default function Reports() {
  const [month, setMonth] = useState(getCurrentMonth());
  const { monthlySummaries, getCategoryBreakdown, getSubCategoryTransactions, getAnomalies } = useReports();
  const [breakdown, setBreakdown] = useState<CategorySummary[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [drilldownId, setDrilldownId] = useState<string | null>(null);
  const [subDrilldownId, setSubDrilldownId] = useState<string | null>(null);
  const [subTxs, setSubTxs] = useState<Transaction[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setDrilldownId(null);
    setSubDrilldownId(null);
    Promise.all([
      getCategoryBreakdown(month).then(setBreakdown),
      getAnomalies(month).then(setAnomalies),
    ]).finally(() => setLoading(false));
  }, [month, getCategoryBreakdown, getAnomalies]);

  useEffect(() => {
    if (!subDrilldownId) { setSubTxs([]); return; }
    setSubLoading(true);
    getSubCategoryTransactions(subDrilldownId, month).then(txs => {
      setSubTxs(txs);
      setSubLoading(false);
    });
  }, [subDrilldownId, month, getSubCategoryTransactions]);

  const months = getPastMonths(12);
  const trendData = [...monthlySummaries].reverse().map(s => ({
    month: s.month.slice(5),
    支出: s.expense / 100,
    收入: s.income / 100,
  }));

  const pieData = breakdown.map(b => ({
    name: b.categoryName,
    value: b.amount / 100,
    ...b,
  }));

  const drilldownCategory = drilldownId ? breakdown.find(b => b.categoryId === drilldownId) : null;
  const subDrilldownCategory = drilldownCategory?.subCategories?.find(s => s.categoryId === subDrilldownId) ?? null;

  const currentExpense = breakdown.reduce((s, b) => s + b.amount, 0);
  const currentMonthSummary = monthlySummaries.find(s => s.month === month);
  const currentIncome = currentMonthSummary?.income ?? 0;

  if (loading) {
    return <div className="px-4 py-8 text-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="px-4 py-8">
      <h1 className="text-xl font-bold text-ink mb-6">报表</h1>

      <select
        value={month}
        onChange={e => setMonth(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-border text-sm bg-white text-ink mb-5"
      >
        {months.map(m => (
          <option key={m} value={m}>{formatMonth(m)}</option>
        ))}
      </select>

      {/* Monthly summary — renders immediately */}
      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-3">月度收支汇总</h2>
        <div className="flex justify-around text-center">
          <div>
            <p className="text-xs text-gray-400">支出</p>
            <p className="text-lg font-bold text-expense font-mono tabular-nums">{formatAmount(currentExpense)}</p>
            {(() => {
              const lastMonth = monthlySummaries.find(s => {
                const [y, m] = month.split('-').map(Number);
                const last = new Date(y, m - 2, 1);
                const lm = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
                return s.month === lm;
              });
              if (!lastMonth || lastMonth.expense === 0) return null;
              const change = Math.round(((currentExpense - lastMonth.expense) / lastMonth.expense) * 100);
              if (change === 0) return <p className="text-xs text-gray-400 mt-0.5">环比持平</p>;
              const isUp = change > 0;
              return (
                <p className={`text-xs mt-0.5 ${isUp ? 'text-red-400' : 'text-green-500'}`}>
                  环比 {isUp ? '↑' : '↓'} {Math.abs(change)}%
                </p>
              );
            })()}
          </div>
          <div>
            <p className="text-xs text-gray-400">收入</p>
            <p className="text-lg font-bold text-income font-mono tabular-nums">{formatAmount(currentIncome)}</p>
            {(() => {
              const lastMonth = monthlySummaries.find(s => {
                const [y, m] = month.split('-').map(Number);
                const last = new Date(y, m - 2, 1);
                const lm = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
                return s.month === lm;
              });
              if (!lastMonth || lastMonth.income === 0) return null;
              const change = Math.round(((currentIncome - lastMonth.income) / lastMonth.income) * 100);
              if (change === 0) return <p className="text-xs text-gray-400 mt-0.5">环比持平</p>;
              const isUp = change > 0;
              return (
                <p className={`text-xs mt-0.5 ${isUp ? 'text-green-500' : 'text-red-400'}`}>
                  环比 {isUp ? '↑' : '↓'} {Math.abs(change)}%
                </p>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Charts — lazy loaded */}
      <Suspense fallback={<ChartFallback />}>
        <Charts
          pieData={pieData}
          breakdown={breakdown}
          drilldownId={drilldownId}
          drilldownCategory={drilldownCategory ?? null}
          subDrilldownCategory={subDrilldownCategory ?? null}
          subTxs={subTxs}
          subLoading={subLoading}
          trendData={trendData}
          onDrilldown={setDrilldownId}
          onSubDrilldown={setSubDrilldownId}
          onBack={() => { setDrilldownId(null); setSubDrilldownId(null); }}
          onSubBack={() => setSubDrilldownId(null)}
          hasPieData={pieData.length > 0}
        />
      </Suspense>

      {/* Anomalies — no Recharts dependency, renders immediately */}
      {anomalies.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-800 mb-2">⚠️ 异常预警</h2>
          {anomalies.map(a => (
            <div key={a.categoryId} className="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
              <span>{a.icon} {a.categoryName}</span>
              <span className="text-red-500 font-medium">+{a.deviation}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
