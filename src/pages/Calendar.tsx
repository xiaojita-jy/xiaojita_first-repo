import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { getCalendarDays, formatAmount } from '../utils/format';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 9 }, (_, i) => CURRENT_YEAR - 2 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function Calendar() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const navigate = useNavigate();

  // 切换月份时清除选中状态
  useEffect(() => {
    setSelectedDate(null);
  }, [year, month]);

  const { transactions, loading } = useTransactions();
  const { getById } = useCategories();

  // 按日期汇总收支
  const dailySummary = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    transactions.forEach(tx => {
      const entry = map.get(tx.date) || { income: 0, expense: 0 };
      if (tx.type === 'income') entry.income += tx.amount;
      else entry.expense += tx.amount;
      map.set(tx.date, entry);
    });
    return map;
  }, [transactions]);

  function getHeatLevel(amountInCents: number): number {
    if (amountInCents <= 0) return 0;
    if (amountInCents < 5000) return 1;
    if (amountInCents < 10000) return 2;
    if (amountInCents < 20000) return 3;
    return 4;
  }

  /** 格内金额显示，超大金额截断 */
  function formatCellAmount(cents: number): string {
    if (cents >= 99900) return '999+';
    return formatAmount(cents);
  }

  // 热力图背景色映射（复用 Tailwind red 色系）
  const HEAT_BG: Record<number, string> = {
    0: 'bg-[rgba(30,41,59,0.3)] border border-[rgba(71,85,105,0.2)]',
    1: 'bg-red-950/30',
    2: 'bg-red-950/50',
    3: 'bg-red-900/50',
    4: 'bg-red-800/50',
  };

  const HEAT_TEXT: Record<number, string> = {
    0: 'text-slate-400',
    1: 'text-red-300',
    2: 'text-red-300',
    3: 'text-red-200',
    4: 'text-red-100',
  };

  // 月度汇总（含上月对比数据）
  const monthSummary = useMemo(() => {
    // 上月
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevMonthPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    const currentTxs = transactions.filter(t => t.date.startsWith(`${year}-${String(month).padStart(2, '0')}`));
    const prevTxs = transactions.filter(t => t.date.startsWith(prevMonthPrefix));

    const curExpenses = currentTxs.filter(t => t.type === 'expense');
    const prevExpenses = prevTxs.filter(t => t.type === 'expense');

    // 日均支出
    const curDays = new Set(curExpenses.map(t => t.date)).size || 1;
    const prevDays = new Set(prevExpenses.map(t => t.date)).size || 1;
    const curDailyAvg = curExpenses.reduce((s, t) => s + t.amount, 0) / curDays;
    const prevDailyAvg = prevExpenses.reduce((s, t) => s + t.amount, 0) / prevDays;

    // 月累计（同期比较：本月和上月都截止到同一天）
    const today = new Date();
    const curMonthTotal = curExpenses.reduce((s, t) => s + t.amount, 0);
    const dayOfMonth = Math.min(today.getDate(), new Date(year, month, 0).getDate());
    const curMonthCutoff = `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
    const curMonthSamePeriod = curExpenses.filter(t => t.date <= curMonthCutoff).reduce((s, t) => s + t.amount, 0);
    const prevMonthCutoff = `${prevMonthPrefix}-${String(Math.min(dayOfMonth, new Date(prevYear, prevMonth, 0).getDate())).padStart(2, '0')}`;
    const prevMonthSamePeriod = prevExpenses.filter(t => t.date <= prevMonthCutoff).reduce((s, t) => s + t.amount, 0);

    // 交易天数
    const curTxDays = new Set(curExpenses.map(t => t.date)).size;
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    return {
      dailyAvg: Math.round(curDailyAvg),
      prevDailyAvg: Math.round(prevDailyAvg),
      dailyAvgDelta: prevDailyAvg > 0 ? Math.round(((curDailyAvg - prevDailyAvg) / prevDailyAvg) * 100) : 0,
      monthTotal: curMonthTotal,
      prevMonthSamePeriod,
      monthTotalDelta: prevMonthSamePeriod > 0 ? Math.round(((curMonthSamePeriod - prevMonthSamePeriod) / prevMonthSamePeriod) * 100) : 0,
      txDays: curTxDays,
      totalDays: totalDaysInMonth,
    };
  }, [transactions, year, month]);

  // 选中日期的分类明细
  const selectedDayDetail = useMemo(() => {
    if (!selectedDate) return null;

    const dayTxs = transactions.filter(t => t.date === selectedDate);
    const expenses = dayTxs.filter(t => t.type === 'expense');
    const incomes = dayTxs.filter(t => t.type === 'income');

    // 按分类汇总支出
    const byCategory = new Map<string, { amount: number }>();
    expenses.forEach(tx => {
      const entry = byCategory.get(tx.categoryId) || { amount: 0 };
      entry.amount += tx.amount;
      byCategory.set(tx.categoryId, entry);
    });

    // 计算各分类本月日均
    const currentMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const categoryDailyAvgs = new Map<string, number>();
    byCategory.forEach((_, catId) => {
      const catTxs = transactions.filter(t =>
        t.type === 'expense' &&
        t.categoryId === catId &&
        t.date.startsWith(currentMonthPrefix)
      );
      const catDays = new Set(catTxs.map(t => t.date)).size || 1;
      categoryDailyAvgs.set(catId, catTxs.reduce((s, t) => s + t.amount, 0) / catDays);
    });

    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][new Date(selectedDate).getDay()];

    return {
      date: selectedDate,
      dayOfWeek,
      totalExpense,
      totalIncome,
      categories: Array.from(byCategory.entries()).map(([catId, data]) => {
        const avg = categoryDailyAvgs.get(catId) || 0;
        const delta = avg > 0 ? Math.round(((data.amount - avg) / avg) * 100) : 0;
        return { categoryId: catId, amount: data.amount, dailyAvg: Math.round(avg), delta };
      }).sort((a, b) => b.amount - a.amount),
    };
  }, [selectedDate, transactions, year, month]);

  // 生成日历网格
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  if (loading) {
    return (
      <div className="px-5 pt-7 pb-8">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-[26px] font-bold text-text-primary tracking-tight">日历</h1>
        </div>
        {/* 摘要条骨架 */}
        <div className="card p-4 mb-4 animate-pulse">
          <div className="flex justify-between">
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-2.5 w-10 bg-slate-700/40 rounded" />
              <div className="h-5 w-14 bg-slate-700/40 rounded" />
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-2.5 w-10 bg-slate-700/40 rounded" />
              <div className="h-5 w-14 bg-slate-700/40 rounded" />
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-2.5 w-10 bg-slate-700/40 rounded" />
              <div className="h-5 w-14 bg-slate-700/40 rounded" />
            </div>
          </div>
        </div>
        {/* 网格骨架 */}
        <div className="grid grid-cols-7 gap-[3px]">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="bg-slate-800/30 rounded-lg min-h-[52px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-7 pb-8">
      {/* 标题 + 月份选择 */}
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight">日历</h1>
        <div className="flex gap-1.5 ml-auto">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="select-dark"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="select-dark"
          >
            {MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
          </select>
        </div>
      </div>

      {/* 月度摘要条 */}
      <div className="card p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <p className="text-[10.5px] text-slate-500 font-medium mb-0.5">日均支出</p>
            <p className="text-xl font-bold text-text-primary tabular-nums">
              {formatAmount(monthSummary.dailyAvg)}
            </p>
            {monthSummary.dailyAvgDelta !== 0 && (
              <p className={`text-[10px] mt-0.5 ${monthSummary.dailyAvgDelta > 0 ? 'text-expense' : 'text-income'}`}>
                较上月 {monthSummary.dailyAvgDelta > 0 ? '▲' : '▼'}{Math.abs(monthSummary.dailyAvgDelta)}%
              </p>
            )}
          </div>
          <div className="w-px h-9 bg-border mx-2" />
          <div className="text-center flex-1">
            <p className="text-[10.5px] text-slate-500 font-medium mb-0.5">月累计</p>
            <p className="text-xl font-bold text-text-primary tabular-nums">
              {formatAmount(monthSummary.monthTotal)}
            </p>
            {monthSummary.monthTotalDelta !== 0 && (
              <p className={`text-[10px] mt-0.5 ${monthSummary.monthTotalDelta > 0 ? 'text-expense' : 'text-income'}`}>
                较上月 {monthSummary.monthTotalDelta > 0 ? '▲' : '▼'}{Math.abs(monthSummary.monthTotalDelta)}%
              </p>
            )}
          </div>
          <div className="w-px h-9 bg-border mx-2" />
          <div className="text-center flex-1">
            <p className="text-[10.5px] text-slate-500 font-medium mb-0.5">交易天数</p>
            <p className="text-xl font-bold text-text-primary tabular-nums">
              {monthSummary.txDays}<span className="text-xs text-slate-500">/{monthSummary.totalDays}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{monthSummary.totalDays}天</p>
          </div>
        </div>
      </div>

      {/* 星期头 */}
      <div className="grid grid-cols-7 mb-1">
        {['一', '二', '三', '四', '五', '六', '日'].map(w => (
          <div key={w} className="text-center text-[11px] text-slate-600 font-medium py-2">
            {w}
          </div>
        ))}
      </div>

      {/* 热力图网格 */}
      <div className="grid grid-cols-7 gap-[3px]">
        {days.map((day) => {
          const summary = dailySummary.get(day.date);
          const expenseAmount = summary?.expense || 0;
          const heatLevel = getHeatLevel(expenseAmount);
          const hasIncome = summary && summary.income > 0;
          const isSelected = selectedDate === day.date;

          if (!day.isCurrentMonth) {
            return (
              <div
                key={day.date}
                onClick={() => {
                  // Clicking a non-current month day navigates to that month
                  const d = new Date(day.date);
                  setYear(d.getFullYear());
                  setMonth(d.getMonth() + 1);
                }}
                className="bg-[rgba(20,28,38,0.4)] rounded-lg min-h-[52px] p-2 flex items-end justify-end cursor-pointer hover:bg-[rgba(30,41,59,0.5)] transition-colors"
              >
                <span className="text-xs text-slate-600">{day.day}</span>
              </div>
            );
          }

          return (
            <div
              key={day.date}
              onClick={() => {
                if (expenseAmount > 0 || hasIncome) {
                  setSelectedDate(selectedDate === day.date ? null : day.date);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (expenseAmount > 0 || hasIncome) {
                  navigate(`/records?date=${day.date}`);
                }
              }}
              className={`
                ${HEAT_BG[heatLevel]}
                rounded-lg min-h-[52px] p-2 flex flex-col justify-between
                relative select-none
                transition-all duration-150
                ${isSelected ? 'ring-2 ring-accent scale-[1.05] shadow-md z-10' : ''}
                ${!isSelected && selectedDate ? 'opacity-50' : ''}
                ${day.isToday && !isSelected ? 'ring-1 ring-inset ring-accent' : ''}
                ${expenseAmount > 0 || hasIncome ? 'cursor-pointer active:scale-95' : 'cursor-default'}
              `}
            >
              {/* 收入绿点标记 */}
              {hasIncome && (
                <span className="absolute top-1.5 left-1.5 w-[5px] h-[5px] rounded-full bg-[#10b981]" />
              )}
              {/* 日期数字 */}
              <span className={`
                text-xs self-end leading-none
                ${HEAT_TEXT[heatLevel]}
                ${day.isToday && !isSelected ? 'font-semibold !text-accent' : heatLevel >= 3 ? 'font-semibold' : ''}
              `}>
                {day.day}
              </span>
              {/* 支出金额 */}
              {expenseAmount > 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <span className={`
                    tabular-nums font-bold leading-tight
                    ${expenseAmount >= 20000 ? 'text-base' : expenseAmount >= 10000 ? 'text-sm' : expenseAmount >= 5000 ? 'text-xs' : 'text-[11px]'}
                    ${HEAT_TEXT[heatLevel]}
                  `}>
                    {formatCellAmount(expenseAmount)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 详情面板 */}
      {selectedDayDetail && (
        <div className="mt-3 card animate-slide-up">
          {/* 拖拽指示条 */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-8 h-1 rounded-full bg-slate-600" />
          </div>
          <div className="px-4 pb-3">
            {/* 日期 + 总计 */}
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-semibold text-slate-200">
                {`${month}月${new Date(selectedDayDetail.date).getDate()}日 · 周${selectedDayDetail.dayOfWeek}`}
              </span>
              <span className="text-xl font-bold text-expense tabular-nums">
                ¥{formatAmount(selectedDayDetail.totalExpense)}
              </span>
            </div>
            {/* 收入（如有） */}
            {selectedDayDetail.totalIncome > 0 && (
              <p className="text-xs text-income mb-2">
                收入 ¥{formatAmount(selectedDayDetail.totalIncome)}
              </p>
            )}
            {/* 长按提示 */}
            <p className="text-[10px] text-slate-600 mb-2">长按日期格跳转查看全部记录</p>
            {/* 分类明细 */}
            {selectedDayDetail.categories.map((item) => {
              const cat = getById(item.categoryId);
              return (
                <div key={item.categoryId} className="flex justify-between items-center py-1.5 border-b border-[rgba(71,85,105,0.15)] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat?.icon || '📌'}</span>
                    <span className="text-[13px] text-slate-200">{cat?.name || '未知'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-expense tabular-nums">
                      ¥{formatAmount(item.amount)}
                    </span>
                    {item.delta !== 0 && (
                      <span className={`text-[10px] ml-1 ${item.delta > 0 ? 'text-expense' : 'text-income'}`}>
                        {item.delta > 0 ? '▲' : '▼'}{Math.abs(item.delta)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 色阶图例 */}
      <div className="flex items-center gap-2 mt-3 px-1">
        <span className="text-[10px] text-slate-600">¥0</span>
        <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-[rgba(30,41,59,0.3)] via-red-950/40 to-red-800/50" />
        <span className="text-[10px] text-slate-600">¥200+</span>
      </div>

      {/* 空状态提示 */}
      {monthSummary.txDays === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">📝</p>
          <p className="text-sm text-slate-500">这个月还没有记录</p>
        </div>
      )}
    </div>
  );
}
