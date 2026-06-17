import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import { getCalendarDays, formatAmount } from '../utils/format';
import type { CalendarDay } from '../utils/format';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 9 }, (_, i) => CURRENT_YEAR - 2 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function Calendar() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const navigate = useNavigate();

  const { transactions, loading } = useTransactions();

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

  // 生成日历网格
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);

  const handleDayClick = (day: CalendarDay) => {
    const summary = dailySummary.get(day.date);
    if (summary && (summary.income > 0 || summary.expense > 0)) {
      navigate(`/records?date=${day.date}`);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-8">
        <h1 className="text-xl font-bold text-ink mb-6">日历</h1>
        <p className="text-center text-gray-400 py-10">加载中...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      {/* 标题 + 年份/月份选择 */}
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-xl font-bold text-ink">日历</h1>
        <div className="flex gap-1.5 ml-auto">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg border border-border text-sm bg-white text-ink"
          >
            {YEARS.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg border border-border text-sm bg-white text-ink"
          >
            {MONTHS.map(m => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
        </div>
      </div>

      {/* 星期头 */}
      <div className="grid grid-cols-7 mb-1">
        {['一', '二', '三', '四', '五', '六', '日'].map(w => (
          <div key={w} className="text-center text-xs text-gray-400 py-2">
            {w}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 border-l border-t border-border rounded-lg overflow-hidden">
        {days.map((day) => {
          const summary = dailySummary.get(day.date);
          const hasTransactions = summary && (summary.income > 0 || summary.expense > 0);

          return (
            <div
              key={day.date}
              onClick={() => handleDayClick(day)}
              className={`
                border-r border-b border-border
                min-h-[52px] p-1.5 flex flex-col
                ${day.isCurrentMonth ? 'bg-white' : 'bg-[#f8f6f2]'}
                ${day.isToday ? 'ring-1 ring-inset ring-blue-400' : ''}
                ${hasTransactions ? 'cursor-pointer hover:bg-blue-50/30 active:bg-blue-50/50' : ''}
                transition-colors
              `}
            >
              {/* 日期数字 */}
              <span className={`
                text-xs self-end
                ${day.isCurrentMonth ? 'text-ink' : 'text-gray-300'}
                ${day.isToday ? 'text-blue-500 font-bold' : ''}
              `}>
                {day.day}
              </span>

              {/* 金额 */}
              {day.isCurrentMonth && summary && (
                <div className="flex-1 flex flex-col justify-center items-center mt-0.5 space-y-0.5">
                  {summary.income > 0 && (
                    <span className="text-income text-[10px] leading-tight font-mono tabular-nums">
                      {formatAmount(summary.income)}
                    </span>
                  )}
                  {summary.expense > 0 && (
                    <span className="text-expense text-[10px] leading-tight font-mono tabular-nums">
                      {formatAmount(summary.expense)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
