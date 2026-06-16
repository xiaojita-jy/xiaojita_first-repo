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
 * 日期 → 周几（中文）
 */
export function getDayOfWeek(dateStr: string): string {
  const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const d = new Date(dateStr);
  return DAYS[d.getDay()];
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
