import { describe, it, expect } from 'vitest';
import { generateCSVContent } from '../csv';
import type { Transaction, Category } from '../../models';

const makeCat = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat_1',
  name: '餐饮',
  type: 'expense',
  icon: '🍜',
  order: 1,
  ...overrides,
});

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx_1',
  type: 'expense',
  amount: 3550, // 35.50 元
  categoryId: 'cat_1',
  paymentMethod: 'wechat',
  date: '2024-06-15',
  createdAt: Date.now(),
  ...overrides,
});

describe('generateCSVContent', () => {
  it('以 UTF-8 BOM 开头', () => {
    const result = generateCSVContent([], []);
    expect(result.startsWith('﻿')).toBe(true);
  });

  it('包含表头行', () => {
    const result = generateCSVContent([], []);
    const lines = result.split('\n');
    expect(lines[0]).toBe('﻿日期,类型,金额,一级分类,子分类,支付方式,备注');
  });

  it('支出 → "支出"', () => {
    const tx = makeTx({ type: 'expense' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    expect(lines[1]).toContain(',支出,');
  });

  it('收入 → "收入"', () => {
    const tx = makeTx({ type: 'income' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    expect(lines[1]).toContain(',收入,');
  });

  it('金额从分转换为元', () => {
    const tx = makeTx({ amount: 3550 });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[2]).toBe('35.50');
  });

  it('金额 0 分 → 0.00', () => {
    const tx = makeTx({ amount: 0 });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[2]).toBe('0.00');
  });

  it('一级分类名称', () => {
    const cat = makeCat({ name: '餐饮' });
    const tx = makeTx({ categoryId: cat.id });
    const result = generateCSVContent([tx], [cat]);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[3]).toBe('餐饮'); // 一级分类
    expect(fields[4]).toBe('');     // 子分类为空
  });

  it('子分类：一级分类列显示父分类名，子分类列显示子分类名', () => {
    const parent = makeCat({ id: 'parent', name: '餐饮' });
    const sub = makeCat({ id: 'sub', name: '外卖', parentId: 'parent' });
    const tx = makeTx({ categoryId: 'sub' });
    const result = generateCSVContent([tx], [parent, sub]);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[3]).toBe('餐饮'); // 一级分类 = 父分类名
    expect(fields[4]).toBe('外卖'); // 子分类 = 子分类名
  });

  it('支付方式显示中文标签', () => {
    const tx = makeTx({ paymentMethod: 'alipay' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[5]).toBe('支付宝');
  });

  it('空备注 → 空字段', () => {
    const tx = makeTx({ note: undefined });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[6]).toBe('');
  });

  it('含逗号的字段用双引号包裹', () => {
    const tx = makeTx({ note: '午餐,很好吃' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    expect(lines[1]).toContain('"午餐,很好吃"');
  });

  it('含双引号的字段转义', () => {
    const tx = makeTx({ note: '他说"你好"' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    expect(lines[1]).toContain('"他说""你好"""');
  });

  it('含换行的字段用双引号包裹', () => {
    const tx = makeTx({ note: '第一行\n第二行' });
    const result = generateCSVContent([tx], [makeCat()]);
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('多笔交易 = 多个数据行', () => {
    const txs = [
      makeTx({ id: 'tx_1', date: '2024-06-15' }),
      makeTx({ id: 'tx_2', date: '2024-06-14' }),
    ];
    const result = generateCSVContent(txs, [makeCat()]);
    const lines = result.split('\n');
    expect(lines.length).toBe(3); // BOM+header + 2 data rows
  });

  it('空交易列表 → 只有表头', () => {
    const result = generateCSVContent([], [makeCat()]);
    const lines = result.split('\n');
    // 输出为 BOM+header+\n，split 后得到 [header, '']
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('日期,类型,金额');
  });

  it('分类不存在时的容错', () => {
    const tx = makeTx({ categoryId: 'non_existent' });
    const result = generateCSVContent([tx], []);
    const lines = result.split('\n');
    const fields = lines[1].split(',');
    expect(fields[3]).toBe(''); // 一级分类为空
    expect(fields[4]).toBe(''); // 子分类为空
  });
});
