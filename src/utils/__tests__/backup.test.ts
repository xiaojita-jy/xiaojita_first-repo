import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../adapters/dexie', () => ({
  db: {
    transactions: {
      clear: vi.fn(() => Promise.resolve()),
      add: vi.fn(() => Promise.resolve()),
      orderBy: vi.fn(() => ({ reverse: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([])),
          count: vi.fn(() => Promise.resolve(0)),
          filter: vi.fn(() => ({
            reverse: vi.fn(() => ({ sortBy: vi.fn(() => Promise.resolve([])) })),
          })),
        })),
      })),
    },
    categories: {
      clear: vi.fn(() => Promise.resolve()),
      add: vi.fn(() => Promise.resolve()),
      bulkAdd: vi.fn(() => Promise.resolve()),
      orderBy: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({ sortBy: vi.fn(() => Promise.resolve([])) })),
      })),
      count: vi.fn(() => Promise.resolve(0)),
    },
    budgets: {
      clear: vi.fn(() => Promise.resolve()),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })),
      })),
      add: vi.fn(() => Promise.resolve()),
      update: vi.fn(() => Promise.resolve()),
    },
  },
  DexieAdapter: {
    getAllTransactions: vi.fn(() => Promise.resolve([])),
    getTransactionsByMonth: vi.fn(() => Promise.resolve([])),
    getTransactionsByCategory: vi.fn(() => Promise.resolve([])),
    addTransaction: vi.fn(() => Promise.resolve()),
    updateTransaction: vi.fn(() => Promise.resolve()),
    deleteTransaction: vi.fn(() => Promise.resolve()),
    getAllCategories: vi.fn(() => Promise.resolve([])),
    getCategoriesByType: vi.fn(() => Promise.resolve([])),
    getSubCategories: vi.fn(() => Promise.resolve([])),
    addCategory: vi.fn(() => Promise.resolve()),
    updateCategory: vi.fn(() => Promise.resolve()),
    deleteCategory: vi.fn(() => Promise.resolve()),
    getTransactionCountByCategory: vi.fn(() => Promise.resolve(0)),
    getBudget: vi.fn(() => Promise.resolve(undefined)),
    getAllBudgets: vi.fn(() => Promise.resolve([])),
    setBudget: vi.fn(() => Promise.resolve()),
    deleteBudget: vi.fn(() => Promise.resolve()),
    getSetting: vi.fn(() => Promise.resolve(null)),
    setSetting: vi.fn(() => Promise.resolve()),
    seedDefaultCategories: vi.fn(() => Promise.resolve()),
  },
}));

describe('backup — exportBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('触发文件下载', async () => {
    const { exportBackup } = await import('../backup');
    const clickSpy = vi.fn();
    const createObjectURLSpy = vi.fn(() => 'blob:test');
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = createObjectURLSpy;
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = clickSpy;

    try {
      await exportBackup();
      expect(clickSpy).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalled();
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });

  it('写入 localStorage 备份时间戳', async () => {
    const { exportBackup } = await import('../backup');
    const clickSpy = vi.fn();
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = clickSpy;
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test');

    try {
      await exportBackup();
      const stored = localStorage.getItem('keep_accounts_last_backup');
      expect(stored).toBeTruthy();
      expect(() => new Date(stored!)).not.toThrow();
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });
});

describe('backup — importBackup', () => {
  /**
   * Helper: simulate importBackup by intercepting document.createElement for 'input'.
   * importBackup creates an <input type="file">, sets onchange, and clicks it.
   * We intercept creation to replace click with a custom trigger that fires onchange with our test data.
   */
  async function simulateImport(file: File) {
    const { importBackup } = await import('../backup');
    const originalCreateElement = document.createElement.bind(document);

    // We'll capture the onchange handler when the input is created
    let capturedOnchange: ((e: any) => void) | null = null;

    document.createElement = vi.fn((tag: string, options?: any) => {
      const el = originalCreateElement(tag, options);
      if (tag === 'input') {
        // Override click to trigger onchange with our file instead of opening dialog
        el.click = vi.fn(() => {
          if (capturedOnchange) {
            capturedOnchange({ target: { files: [file] } });
          }
        });
        // Intercept onchange assignment
        const originalSetAttribute = el.setAttribute.bind(el);
        el.setAttribute = vi.fn((name: string, value: any) => {
          originalSetAttribute(name, value);
        });
        // Use defineProperty to intercept
        let _onchange: ((e: any) => void) | null = null;
        Object.defineProperty(el, 'onchange', {
          get() { return _onchange; },
          set(fn: any) {
            _onchange = fn;
            capturedOnchange = fn;
          },
          configurable: true,
        });
      }
      return el;
    }) as any;

    try {
      const promise = importBackup();
      return promise;
    } finally {
      document.createElement = originalCreateElement;
    }
  }

  it('无效版本报错', async () => {
    const file = new File(
      [JSON.stringify({ version: 99 })],
      'test.json',
      { type: 'application/json' }
    );
    await expect(simulateImport(file)).rejects.toThrow('版本不兼容');
  });

  it('缺少 transactions 数组报错', async () => {
    const file = new File(
      [JSON.stringify({ version: 1, categories: [] })],
      'test.json',
      { type: 'application/json' }
    );
    await expect(simulateImport(file)).rejects.toThrow('缺少交易数据');
  });

  it('缺少 categories 数组报错', async () => {
    const file = new File(
      [JSON.stringify({ version: 1, transactions: [] })],
      'test.json',
      { type: 'application/json' }
    );
    await expect(simulateImport(file)).rejects.toThrow('缺少分类数据');
  });
});
