import { describe, it, expect } from 'vitest';
import {
  centsToYuan,
  formatAmount,
  yuanToCents,
  parseAmountToCents,
  getCurrentMonth,
  getToday,
  generateId,
  formatDateShort,
  formatMonth,
  getPastMonths,
  formatBackupTime,
  getCalendarDays,
} from '../format';

describe('centsToYuan', () => {
  it('0 分 → 0 元', () => expect(centsToYuan(0)).toBe(0));
  it('100 分 → 1 元', () => expect(centsToYuan(100)).toBe(1));
  it('150 分 → 1.5 元', () => expect(centsToYuan(150)).toBe(1.5));
  it('99 分 → 0.99 元', () => expect(centsToYuan(99)).toBe(0.99));
  it('-100 分 → -1 元', () => expect(centsToYuan(-100)).toBe(-1));
});

describe('formatAmount', () => {
  it('0 分 → 0', () => expect(formatAmount(0)).toBe('0'));
  it('10000 分 → 100', () => expect(formatAmount(10000)).toBe('100'));
  it('123456 分 → 1235（四舍五入）', () => expect(formatAmount(123456)).toBe('1235'));
  it('-500 分 → 5（不输出负号，靠颜色区分）', () => expect(formatAmount(-500)).toBe('5'));
  it('1 分 → 0（取整为 0）', () => expect(formatAmount(1)).toBe('0'));
  it('50 分 → 1（四舍五入边界）', () => expect(formatAmount(50)).toBe('1'));
  it('49 分 → 0（四舍五入边界）', () => expect(formatAmount(49)).toBe('0'));
  it('1000500 分 → 10005', () => expect(formatAmount(1000500)).toBe('10005'));
  it('minOne: 1 分 → 1', () => expect(formatAmount(1, { minOne: true })).toBe('1'));
  it('minOne: 0 分 → 0', () => expect(formatAmount(0, { minOne: true })).toBe('0'));
  it('minOne: 49 分 → 1', () => expect(formatAmount(49, { minOne: true })).toBe('1'));
  it('minOne: 50 分 → 1', () => expect(formatAmount(50, { minOne: true })).toBe('1'));
});

describe('yuanToCents', () => {
  it('0 元 → 0 分', () => expect(yuanToCents(0)).toBe(0));
  it('1 元 → 100 分', () => expect(yuanToCents(1)).toBe(100));
  it('1.5 元 → 150 分', () => expect(yuanToCents(1.5)).toBe(150));
  it('1.555 元 → 156 分（四舍五入）', () => expect(yuanToCents(1.555)).toBe(156));
  it('-1 元 → -100 分', () => expect(yuanToCents(-1)).toBe(-100));
});

describe('parseAmountToCents', () => {
  it('空字符串 → 0', () => expect(parseAmountToCents('')).toBe(0));
  it('含非数字字符 → 忽略掉', () => expect(parseAmountToCents('abc')).toBe(0));
  it('35 → 3500', () => expect(parseAmountToCents('35')).toBe(3500));
  it('35.5 → 3550', () => expect(parseAmountToCents('35.5')).toBe(3550));
  it('35.50 → 3550', () => expect(parseAmountToCents('35.50')).toBe(3550));
  it('¥1,234.56 → 123456（仅保留数字和小数点）', () => expect(parseAmountToCents('¥1,234.56')).toBe(123456));
  it('0.01 → 1', () => expect(parseAmountToCents('0.01')).toBe(1));
});

describe('getCurrentMonth', () => {
  it('返回 YYYY-MM 格式字符串', () => {
    const month = getCurrentMonth();
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });

  it('年份和月份正确', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(getCurrentMonth()).toBe(expected);
  });
});

describe('getToday', () => {
  it('返回 YYYY-MM-DD 格式字符串', () => {
    expect(getToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('generateId', () => {
  it('返回非空字符串', () => {
    expect(generateId()).toBeTruthy();
    expect(typeof generateId()).toBe('string');
  });

  it('两次调用返回不同值', () => {
    expect(generateId()).not.toBe(generateId());
  });
});

describe('formatDateShort', () => {
  it('2024-06-16 → 6月16日', () => {
    expect(formatDateShort('2024-06-16')).toBe('6月16日');
  });
  it('2024-01-03 → 1月3日', () => {
    expect(formatDateShort('2024-01-03')).toBe('1月3日');
  });
  it('2024-12-31 → 12月31日', () => {
    expect(formatDateShort('2024-12-31')).toBe('12月31日');
  });
});

describe('formatMonth', () => {
  it('2024-06 → 2024年6月', () => {
    expect(formatMonth('2024-06')).toBe('2024年6月');
  });
  it('2024-11 → 2024年11月', () => {
    expect(formatMonth('2024-11')).toBe('2024年11月');
  });
});

describe('getPastMonths', () => {
  it('返回指定长度的数组', () => {
    expect(getPastMonths(6)).toHaveLength(6);
    expect(getPastMonths(3)).toHaveLength(3);
  });

  it('每个元素匹配 YYYY-MM 格式', () => {
    getPastMonths(6).forEach(m => expect(m).toMatch(/^\d{4}-\d{2}$/));
  });

  it('第一个元素为当前月份', () => {
    expect(getPastMonths(6)[0]).toBe(getCurrentMonth());
  });

  it('元素按时间倒序排列', () => {
    const months = getPastMonths(3);
    expect(months[0] >= months[1]).toBe(true);
    expect(months[1] >= months[2]).toBe(true);
  });
});

describe('formatBackupTime', () => {
  it('ISO 字符串 → 中文显示', () => {
    const result = formatBackupTime('2024-06-16T10:30:00.000Z');
    // toLocaleString 因环境可能不同，只验证非空且包含年月日基本元素
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(5);
  });

  it('非法 ISO 返回原字符串', () => {
    expect(formatBackupTime('invalid')).toBe('invalid');
  });
});

describe('getCalendarDays', () => {
  it('2026-06 返回 35 天（5 周，6月1日是周一，无需前置填充）', () => {
    const days = getCalendarDays(2026, 6);
    expect(days).toHaveLength(35);
  });

  it('2026-07 返回 35 天（5 周，7月1日是周三，首格为周一6月29日）', () => {
    const days = getCalendarDays(2026, 7);
    expect(days).toHaveLength(35);
    // 7月1日是周三，offset=2，第一格应为周一 6月29日
    expect(days[0].date).toBe('2026-06-29');
    expect(days[0].isCurrentMonth).toBe(false);
    expect(days[2].date).toBe('2026-07-01');
    expect(days[2].isCurrentMonth).toBe(true);
  });

  it('2026-03 返回 42 天（6 周，3月1日是周日）', () => {
    const days = getCalendarDays(2026, 3);
    expect(days).toHaveLength(42);
  });

  it('2027-02 返回 35 天（28天非闰年，2月1日周一，需强制补足至35格）', () => {
    const days = getCalendarDays(2027, 2);
    // Feb 2027: 1st is Monday (offset=0), 28th is Sunday (endOffset=6)
    // Raw: 0 + 28 + 0 = 28 → enforced to 35
    expect(days).toHaveLength(35);
    expect(days[0].date).toBe('2027-02-01');
    expect(days[0].isCurrentMonth).toBe(true);
    // 后7格应为3月1-7日（补足到35格）
    const trailing = days.slice(28);
    trailing.forEach(d => expect(d.isCurrentMonth).toBe(false));
    expect(trailing[0].date).toBe('2027-03-01');
    expect(trailing[6].date).toBe('2027-03-07');
  });

  it('第一天是当月的 1 号', () => {
    const days = getCalendarDays(2026, 6);
    const firstCurrent = days.find(d => d.isCurrentMonth)!;
    expect(firstCurrent.day).toBe(1);
    expect(firstCurrent.date).toBe('2026-06-01');
  });

  it('前置填充日 isCurrentMonth 为 false', () => {
    const days = getCalendarDays(2026, 7); // 7月1日是周三，前2天是6月29、30
    expect(days[0].isCurrentMonth).toBe(false);
    expect(days[1].isCurrentMonth).toBe(false);
    expect(days[2].isCurrentMonth).toBe(true); // 7月1日
  });

  it('后置填充日 isCurrentMonth 为 false', () => {
    const days = getCalendarDays(2026, 6); // 6月30日是周二，后5天是7月1-5日
    const lastFew = days.slice(-5);
    lastFew.forEach(d => expect(d.isCurrentMonth).toBe(false));
  });

  it('2024-12 前置填充（12月1日是周日，前6天为11月）', () => {
    const days = getCalendarDays(2024, 12);
    const firstCurrent = days.find(d => d.isCurrentMonth)!;
    expect(firstCurrent.date).toBe('2024-12-01');
    expect(days[0].isCurrentMonth).toBe(false);
    expect(days[0].date).toBe('2024-11-25');
  });

  it('跨年：2026-01 日历包含 2025-12 的前置日期', () => {
    const days = getCalendarDays(2026, 1);
    const firstPadding = days[0];
    expect(firstPadding.isCurrentMonth).toBe(false);
    expect(firstPadding.date).toBe('2025-12-29');
  });

  it('每周从周一开始，第一列为周一', () => {
    const days = getCalendarDays(2026, 6);
    // 2026-06-01 是周一，offset=0，第一格就是6月1日
    const monday = new Date(days[0].date);
    expect(monday.getDay()).toBe(1); // 周一
  });

  it('返回的日期字符串格式为 YYYY-MM-DD', () => {
    const days = getCalendarDays(2026, 6);
    days.forEach(d => {
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('isToday 标记今天', () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const days = getCalendarDays(year, month);
    const todayItem = days.find(d => d.date === todayStr);
    expect(todayItem).toBeDefined();
    expect(todayItem!.isToday).toBe(true);
  });
});
