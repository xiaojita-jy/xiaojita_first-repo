import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import EmptyState from './EmptyState';
import { formatAmount, formatDateShort } from '../utils/format';
import type { CategorySummary } from '../hooks/useReports';
import type { Transaction } from '../models';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface ChartsProps {
  pieData: Array<{ name: string; value: number; color?: string; categoryId: string; categoryName: string; icon: string; percentage: number; subCategories?: CategorySummary[] }>;
  breakdown: CategorySummary[];
  drilldownId: string | null;
  drilldownCategory: CategorySummary | null;
  subDrilldownCategory: CategorySummary | null;
  subTxs: Transaction[];
  subLoading: boolean;
  trendData: Array<{ month: string; 支出: number; 收入: number }>;
  onDrilldown: (id: string) => void;
  onSubDrilldown: (id: string) => void;
  onBack: () => void;
  onSubBack: () => void;
  hasPieData: boolean;
}

export default function Charts({
  pieData, breakdown, drilldownId, drilldownCategory,
  subDrilldownCategory, subTxs, subLoading, trendData,
  onDrilldown, onSubDrilldown, onBack, onSubBack, hasPieData,
}: ChartsProps) {
  return (
    <>
      {/* Pie chart section */}
      {hasPieData ? (
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-1 mb-2">
            {subDrilldownCategory ? (
              <>
                <button onClick={onBack} className="text-xs text-blue-500 hover:underline">
                  📊 支出构成
                </button>
                <span className="text-xs text-gray-400">›</span>
                <button onClick={onSubBack} className="text-xs text-blue-500 hover:underline">
                  {drilldownCategory?.icon} {drilldownCategory?.categoryName}
                </button>
                <span className="text-xs text-gray-400">›</span>
                <span className="text-sm font-semibold text-ink">
                  {subDrilldownCategory.icon} {subDrilldownCategory.categoryName}
                </span>
              </>
            ) : drilldownCategory ? (
              <>
                <button onClick={onBack} className="text-xs text-blue-500 hover:underline">
                  📊 支出构成
                </button>
                <span className="text-xs text-gray-400">›</span>
                <span className="text-sm font-semibold text-ink">
                  {drilldownCategory.icon} {drilldownCategory.categoryName}
                </span>
              </>
            ) : (
              <h2 className="text-sm font-medium text-gray-800">支出构成</h2>
            )}
          </div>

          {subDrilldownCategory ? (
            subLoading ? (
              <p className="text-center text-gray-400 py-6 text-sm">加载中...</p>
            ) : subTxs.length === 0 ? (
              <EmptyState icon="📋" message="该分类下暂无记录" />
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {subTxs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 bg-[#faf9f6] rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{formatDateShort(tx.date)}</span>
                      {tx.note && <span className="text-xs text-gray-500 truncate max-w-[120px]">{tx.note}</span>}
                    </div>
                    <span className="text-expense tabular-nums text-xs">{formatAmount(tx.amount, { minOne: true })}</span>
                  </div>
                ))}
                <div className="text-right text-xs text-gray-400 pt-1 border-t border-gray-100">
                  合计 <span className="text-expense font-semibold">{formatAmount(subDrilldownCategory.amount, { minOne: true })}</span>
                </div>
              </div>
            )
          ) : (
            <>
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
                    cursor="pointer"
                    onClick={(data) => {
                      if (!drilldownId) {
                        const cat = breakdown.find(b => b.categoryName === data.name);
                        if (cat?.subCategories?.length) onDrilldown(cat.categoryId);
                      } else if (drilldownCategory?.subCategories) {
                        const sub = drilldownCategory.subCategories.find(s => s.categoryName === data.name);
                        if (sub) onSubDrilldown(sub.categoryId);
                      }
                    }}
                  >
                    {(drilldownCategory?.subCategories || breakdown).map((item: any, i: number) => (
                      <Cell key={i} fill={item.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => Number(value).toFixed(2)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {(drilldownCategory?.subCategories || pieData).map((d: any, i: number) => (
                  <span key={d.categoryName || d.name} className="text-xs text-gray-500">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1"
                      style={{ background: d.color || COLORS[i % COLORS.length] }}
                    />
                    {d.categoryName || d.name} {d.percentage}%
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <EmptyState icon="📊" message="暂无数据" />
      )}

      {/* Trend line section */}
      {trendData.length > 1 && (
        <div className="card p-4 mb-4">
          <h2 className="text-sm font-semibold text-ink mb-3">近6月趋势</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData.slice(-6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => Number(value).toFixed(2)} />
              <Line type="monotone" dataKey="支出" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="收入" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
