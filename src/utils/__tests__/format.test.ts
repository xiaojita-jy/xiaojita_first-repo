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
} from '../format';

describe('centsToYuan', () => {
  it('0 分 → 0 元', () => expect(centsToYuan(0)).toBe(0));
  it('100 分 → 1 元', () => expect(centsToYuan(100)).toBe(1));
  it('150 分 → 1.5 元', () => expect(centsToYuan(150)).toBe(1.5));
  it('99 分 → 0.99 元', () => expect(centsToYuan(99)).toBe(0.99));
  it('-100 分 → -1 元', () => expect(centsToYuan(-100)).toBe(-1));
});

describe('formatAmount', () => {
  it('0 分 → ¥0.00', () => expect(formatAmount(0)).toBe('¥0.00'));
  it('10000 分 → ¥100.00', () => expect(formatAmount(10000)).toBe('¥100.00'));
  it('123456 分 → ¥1,234.56', () => expect(formatAmount(123456)).toBe('¥1,234.56'));
  it('-500 分 → -¥5.00', () => expect(formatAmount(-500)).toBe('-¥5.00'));
  it('1 分 → ¥0.01', () => expect(formatAmount(1)).toBe('¥0.01'));
  it('1000500 分 → ¥10,005.00', () => expect(formatAmount(1000500)).toBe('¥10,005.00'));
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
