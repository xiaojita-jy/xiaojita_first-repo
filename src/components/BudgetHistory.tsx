import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBudget, type BudgetHistoryItem } from '../hooks/useBudget';
import { getYearOptions, getMonthOptions } from '../utils/format';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

function rateColor(rate: number): string {
  if (rate >= 100) return 'text-red-400';
  if (rate >= 80) return 'text-amber-400';
  return 'text-emerald-400';
}

type ViewMode = 'table' | 'chart';
type TableOrientation = 'monthsAsRows' | 'categoriesAsRows';

export default function BudgetHistory() {
  const { getBudgetHistory } = useBudget();

  // 默认范围：6个月前（含当前月）
  const defaultStart = new Date(CURRENT_YEAR, CURRENT_MONTH - 6, 1);
  const [startYear, setStartYear] = useState(defaultStart.getFullYear());
  const [startMonth, setStartMonth] = useState(defaultStart.getMonth() + 1);
  const [endYear, setEndYear] = useState(CURRENT_YEAR);
  const [endMonth, setEndMonth] = useState(CURRENT_MONTH);

  const [data, setData] = useState<BudgetHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [tableOrientation, setTableOrientation] = useState<TableOrientation>('monthsAsRows');

  const yearOptions = useMemo(() => getYearOptions(), []);
  const startMonthOptions = useMemo(() => getMonthOptions(startYear), [startYear]);
  const endMonthOptions = useMemo(() => getMonthOptions(endYear), [endYear]);

  const loadData = useCallback(async () => {
    const sm = `${startYear}-${String(startMonth).padStart(2, '0')}`;
    const em = `${endYear}-${String(endMonth).padStart(2, '0')}`;
    if (sm > em) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getBudgetHistory(sm, em);
    setData(result);
    setLoading(false);
  }, [startYear, startMonth, endYear, endMonth, getBudgetHistory]);

  useEffect(() => { loadData(); }, [loadData]);

  // 处理起始年变化导致月份超出范围
  const handleStartYearChange = (y: number) => {
    setStartYear(y);
    const maxMonth = getMonthOptions(y).length;
    if (startMonth > maxMonth) setStartMonth(maxMonth);
  };
  const handleEndYearChange = (y: number) => {
    setEndYear(y);
    const maxMonth = getMonthOptions(y).length;
    if (endMonth > maxMonth) setEndMonth(maxMonth);
  };

  // 收集所有出现过的分类（并集）
  const allCategoryKeys = useMemo(() => {
    const set = new Map<string, { name: string; icon: string; color?: string }>();
    data.forEach(item => {
      item.categories.forEach(c => {
        if (!set.has(c.categoryId)) {
          set.set(c.categoryId, { name: c.categoryName, icon: c.categoryIcon, color: c.color });
        }
      });
    });
    return Array.from(set.entries()).map(([id, info]) => ({ categoryId: id, ...info }));
  }, [data]);

  // 月份格式化为 "06月"
  const formatMonthLabel = (m: string) => m.slice(5) + '月';

  // 图表数据
  const chartData = useMemo(() => {
    return data.map(item => {
      const point: Record<string, number | string> = {
        month: formatMonthLabel(item.month),
        总预算执行率: item.totalRate,
      };
      item.categories.forEach(c => {
        point[c.categoryName] = c.rate;
      });
      return point;
    });
  }, [data]);

  // 分类折线颜色
  const categoryLineKeys = useMemo(() => {
    return allCategoryKeys.map(c => c.name);
  }, [allCategoryKeys]);

  const categoryColors = useMemo(() => {
    const defaultColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    return allCategoryKeys.map((c, i) => c.color || defaultColors[i % defaultColors.length]);
  }, [allCategoryKeys]);

  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-text-primary mb-3">预算执行率对比</h2>

      {/* 月份范围选择器 */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <select value={startYear} onChange={e => handleStartYearChange(Number(e.target.value))}
          className="px-2 py-1 rounded-lg border border-border text-sm bg-[rgba(30,41,59,0.4)] text-text-primary">
          {yearOptions.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))}
          className="px-2 py-1 rounded-lg border border-border text-sm bg-[rgba(30,41,59,0.4)] text-text-primary">
          {startMonthOptions.map(m => <option key={m} value={m}>{m}月</option>)}
        </select>
        <span className="text-xs text-slate-400 mx-1">—</span>
        <select value={endYear} onChange={e => handleEndYearChange(Number(e.target.value))}
          className="px-2 py-1 rounded-lg border border-border text-sm bg-[rgba(30,41,59,0.4)] text-text-primary">
          {yearOptions.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))}
          className="px-2 py-1 rounded-lg border border-border text-sm bg-[rgba(30,41,59,0.4)] text-text-primary">
          {endMonthOptions.map(m => <option key={m} value={m}>{m}月</option>)}
        </select>

        {/* 视图切换 */}
        <div className="flex gap-0.5 ml-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'table' ? 'text-white' : 'bg-[rgba(30,41,59,0.4)] text-slate-400'
            }`}
            style={viewMode === 'table' ? { background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' } : undefined}
          >
            表格
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'chart' ? 'text-white' : 'bg-[rgba(30,41,59,0.4)] text-slate-400'
            }`}
            style={viewMode === 'chart' ? { background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' } : undefined}
          >
            图表
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-6 text-sm">加载中...</p>
      ) : data.length === 0 ? (
        <p className="text-center text-slate-400 py-6 text-sm">所选范围内无预算记录</p>
      ) : viewMode === 'table' ? (
        /* 表格模式 */
        <div>
          {/* 行列切换 */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setTableOrientation(
                tableOrientation === 'monthsAsRows' ? 'categoriesAsRows' : 'monthsAsRows'
              )}
              className="px-2 py-1 text-xs text-accent hover:bg-sky-950/30 rounded"
            >
              行↔列切换
            </button>
          </div>

          <div className="overflow-x-auto">
            {tableOrientation === 'monthsAsRows' ? (
              /* 行=月份，列=总预算+分类 */
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[rgba(71,85,105,0.2)]">
                    <th className="text-left py-1.5 px-2 text-slate-400 font-normal">月份</th>
                    <th className="text-right py-1.5 px-2 text-slate-400 font-normal">总预算</th>
                    {allCategoryKeys.map(c => (
                      <th key={c.categoryId} className="text-right py-1.5 px-2 text-slate-400 font-normal">
                        {c.icon} {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map(item => (
                    <tr key={item.month} className="border-b border-[rgba(71,85,105,0.15)]">
                      <td className="py-1.5 px-2 text-text-primary">{formatMonthLabel(item.month)}</td>
                      <td className={`py-1.5 px-2 text-right tabular-nums ${rateColor(item.totalRate)}`}>
                        {item.totalBudget > 0 ? `${item.totalRate}%` : '—'}
                      </td>
                      {allCategoryKeys.map(ck => {
                        const catData = item.categories.find(c => c.categoryId === ck.categoryId);
                        return (
                          <td key={ck.categoryId} className={`py-1.5 px-2 text-right tabular-nums ${
                            catData ? rateColor(catData.rate) : 'text-slate-600'
                          }`}>
                            {catData ? `${catData.rate}%` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* 行=总预算+分类，列=月份 */
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[rgba(71,85,105,0.2)]">
                    <th className="text-left py-1.5 px-2 text-slate-400 font-normal">类别</th>
                    {data.map(item => (
                      <th key={item.month} className="text-right py-1.5 px-2 text-slate-400 font-normal">
                        {formatMonthLabel(item.month)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[rgba(71,85,105,0.15)]">
                    <td className="py-1.5 px-2 text-text-primary">💰 总预算</td>
                    {data.map(item => (
                      <td key={item.month} className={`py-1.5 px-2 text-right tabular-nums ${rateColor(item.totalRate)}`}>
                        {item.totalBudget > 0 ? `${item.totalRate}%` : '—'}
                      </td>
                    ))}
                  </tr>
                  {allCategoryKeys.map(ck => (
                    <tr key={ck.categoryId} className="border-b border-[rgba(71,85,105,0.15)]">
                      <td className="py-1.5 px-2 text-text-primary">{ck.icon} {ck.name}</td>
                      {data.map(item => {
                        const catData = item.categories.find(c => c.categoryId === ck.categoryId);
                        return (
                          <td key={item.month} className={`py-1.5 px-2 text-right tabular-nums ${
                            catData ? rateColor(catData.rate) : 'text-slate-600'
                          }`}>
                            {catData ? `${catData.rate}%` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* 图表模式 */
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={[0, (dataMax: number) => Math.min(Math.ceil(dataMax * 1.15), dataMax + 20)]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip formatter={(value) => `${value as string | number}%`} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="总预算执行率" fill="#3b82f6" barSize={20} radius={[4, 4, 0, 0]} />
              {categoryLineKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={categoryColors[i]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
