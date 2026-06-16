import { useEffect, useState } from 'react';
import { useReports, type CategorySummary, type Anomaly } from '../hooks/useReports';
import { formatAmount, getCurrentMonth, getPastMonths, formatMonth } from '../utils/format';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import EmptyState from '../components/EmptyState';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Reports() {
  const [month, setMonth] = useState(getCurrentMonth());
  const { monthlySummaries, getCategoryBreakdown, getAnomalies } = useReports();
  const [breakdown, setBreakdown] = useState<CategorySummary[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [drilldownId, setDrilldownId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCategoryBreakdown(month).then(setBreakdown),
      getAnomalies(month).then(setAnomalies),
    ]).finally(() => setLoading(false));
  }, [month, getCategoryBreakdown, getAnomalies]);

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

  const currentExpense = breakdown.reduce((s, b) => s + b.amount, 0);
  const currentIncome = trendData.find(d => d.month === month.slice(5))?.收入 ?? 0;

  if (loading) {
    return <div className="px-4 py-6 text-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">报表</h1>

      <select
        value={month}
        onChange={e => setMonth(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white mb-4"
      >
        {months.map(m => (
          <option key={m} value={m}>{formatMonth(m)}</option>
        ))}
      </select>

      {/* Monthly summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-medium text-gray-800 mb-3">月度收支汇总</h2>
        <div className="flex justify-around text-center">
          <div>
            <p className="text-xs text-gray-400">支出</p>
            <p className="text-lg font-bold text-red-500">{formatAmount(currentExpense)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">收入</p>
            <p className="text-lg font-bold text-green-500">{formatAmount(currentIncome * 100)}</p>
          </div>
        </div>
      </div>

      {/* Pie chart */}
      {pieData.length > 0 ? (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="text-sm font-medium text-gray-800 mb-2">
            {drilldownCategory ? `${drilldownCategory.categoryName} - 二级分类` : '支出构成'}
            {drilldownCategory && (
              <button onClick={() => setDrilldownId(null)} className="ml-2 text-xs text-blue-500">← 返回</button>
            )}
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={
                  drilldownCategory?.subCategories
                    ? drilldownCategory.subCategories.map(s => ({ name: s.categoryName, value: s.amount / 100 }))
                    : pieData
                }
                cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                paddingAngle={2} dataKey="value"
                onClick={(data) => {
                  if (!drilldownCategory) {
                    const cat = breakdown.find(b => b.categoryName === data.name);
                    if (cat?.subCategories?.length) setDrilldownId(cat.categoryId);
                  }
                }}
              >
                {(drilldownCategory?.subCategories || breakdown).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `¥${Number(value).toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {pieData.map((d, i) => (
              <span key={d.name} className="text-xs text-gray-500">
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: COLORS[i % COLORS.length] }} />
                {d.name} {d.percentage}%
              </span>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon="📊" message="暂无数据" />
      )}

      {/* Trend line */}
      {trendData.length > 1 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="text-sm font-medium text-gray-800 mb-3">近6月趋势</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData.slice(-6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `¥${Number(value).toFixed(2)}`} />
              <Line type="monotone" dataKey="支出" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="收入" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Anomalies */}
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
