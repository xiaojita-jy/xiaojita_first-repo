/**
 * 分 → 元（数字）
 */
export function centsToYuan(cents: number): number {
  return cents / 100;
}

/**
 * 分 → 显示字符串（¥1,234.56）
 */
export function formatAmount(cents: number): string {
  const yuan = cents / 100;
  if (yuan < 0) {
    return `-¥${Math.abs(yuan).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `¥${yuan.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * 元 → 分（整数）
 */
export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100);
}

/**
 * 解析用户输入的金额字符串 → 分
 * 支持: "35", "35.5", "35.50"
 */
export function parseAmountToCents(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * 获取当前月份字符串 YYYY-MM
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 获取今天的日期字符串 YYYY-MM-DD
 */
export function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * 生成 UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 格式化日期显示：2024-06-16 → 6月16日
 */
export function formatDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${parseInt(month)}月${parseInt(day)}日`;
}

/**
 * 月份显示：2024-06 → 2024年6月
 */
export function formatMonth(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  return `${year}年${parseInt(month)}月`;
}

/**
 * 格式化备份时间显示：ISO 字符串 → 中文显示
 * 2024-06-16T10:30:00.000Z → 2024年6月16日 10:30
 */
export function formatBackupTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN');
}

/**
 * 获取过去 N 个月的月份列表
 */
export function getPastMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

/**
 * 获取以 endMonth 为截止的过去 N 个月
 * endMonth 格式: "YYYY-MM"
 */
export function getPastMonthsFrom(endMonth: string, n: number): string[] {
  const [y, m] = endMonth.split('-').map(Number);
  const months: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(y, m - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

/** 年份下拉选项（当年±2，共9年） */
export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 9 }, (_, i) => currentYear - 2 + i);
}

/** 月份下拉选项（当年只到当前月份） */
export function getMonthOptions(year: number): number[] {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const maxMonth = year === currentYear ? currentMonth : 12;
  return Array.from({ length: maxMonth }, (_, i) => i + 1);
}

/**
 * 日期 → 周几（中文）
 */
export function getDayOfWeek(dateStr: string): string {
  const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const d = new Date(dateStr);
  return DAYS[d.getDay()];
}

/** 日历格子数据 */
export interface CalendarDay {
  date: string;       // YYYY-MM-DD
  day: number;        // 1-31
  isToday: boolean;
  isCurrentMonth: boolean;
}

/**
 * 生成月历网格（周一始，iOS 风格）
 * @returns 35 或 42 个 CalendarDay（5 或 6 周）
 */
export function getCalendarDays(year: number, month: number): CalendarDay[] {
  const today = getToday();
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // 周一起始偏移：周日(0) → 6，周一(1) → 0，...，周六(6) → 5
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const endOffset = lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1;

  const totalDays = lastDay.getDate();
  let totalCells = startOffset + totalDays + (6 - endOffset);
  if (totalCells < 35) totalCells = 35;

  const days: CalendarDay[] = [];
  // 起始日期 = 当月1号 - startOffset 天
  const startDate = new Date(year, month - 1, 1 - startOffset);

  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    days.push({
      date: dateStr,
      day: d.getDate(),
      isToday: dateStr === today,
      isCurrentMonth: d.getMonth() === month - 1,
    });
  }

  return days;
}

/**
 * 获取本周范围（周一到今天）
 * 返回 { start, end, days } 其中 days 是日期数组
 */
export function getWeekRange(): { start: string; end: string; days: string[] } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周一=0

  const days: string[] = [];
  for (let i = 0; i <= mondayOffset; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }

  return {
    start: days[days.length - 1],
    end: days[0],
    days,
  };
}
