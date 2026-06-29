import { useMemo } from 'react';
import type { Template, Category } from '../models';
import { formatAmount } from '../utils/format';
import EmptyState from './EmptyState';

interface TemplatePickerProps {
  templates: Template[];
  allCategories: Category[];
  onSelect: (template: Template) => void;
  onClose: () => void;
}

export default function TemplatePicker({
  templates,
  allCategories,
  onSelect,
  onClose,
}: TemplatePickerProps) {
  /** Index categories by id for O(1) lookup */
  const getCategoryInfo = useMemo(() => {
    const map = new Map<string, Category>();
    for (const cat of allCategories) {
      map.set(cat.id, cat);
    }
    return (id: string): Category | undefined => map.get(id);
  }, [allCategories]);

  /** Format template category display name */
  const formatCategory = (tpl: Template): string => {
    const cat = getCategoryInfo(tpl.categoryId);
    if (!cat) return '未知分类';
    // If categoryId is a sub-category, resolve parent first
    if (cat.parentId) {
      const parent = getCategoryInfo(cat.parentId);
      return parent ? `${parent.name}·${cat.name}` : cat.name;
    }
    // categoryId is top-level; check for distinct subCategoryId
    if (tpl.subCategoryId && tpl.subCategoryId !== tpl.categoryId) {
      const sub = getCategoryInfo(tpl.subCategoryId);
      return sub ? `${cat.name}·${sub.name}` : cat.name;
    }
    return cat.name;
  };

  const typeLabel = (type: 'expense' | 'income') =>
    type === 'expense' ? '支出' : '收入';

  const typeColor = (type: 'expense' | 'income') =>
    type === 'expense' ? 'text-expense bg-red-950/30' : 'text-income bg-emerald-950/30';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      {/* Drawer */}
      <div
        className="relative w-full max-w-lg bg-[rgba(15,25,38,0.98)] rounded-t-2xl max-h-[60vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-[rgba(15,25,38,0.98)] border-b border-[rgba(71,85,105,0.2)] px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="text-sm font-semibold text-text-primary">选择模板</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-300 text-lg leading-none">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {templates.length === 0 ? (
            <EmptyState
              icon="📋"
              message="暂无模板"
            />
          ) : (
            <div className="space-y-2">
              {templates.map(tpl => {
                const cat = getCategoryInfo(tpl.categoryId);
                return (
                  <button
                    key={tpl.id}
                    onClick={() => onSelect(tpl)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[rgba(30,41,59,0.4)] hover:bg-sky-950/30 active:bg-sky-900/40 transition-colors text-left"
                  >
                    {/* Category icon */}
                    <span className="text-xl flex-shrink-0">
                      {cat?.icon || '📌'}
                    </span>
                    {/* Template info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{tpl.name}</div>
                      <div className="text-xs text-slate-400 truncate">{formatCategory(tpl)}</div>
                    </div>
                    {/* Amount + type badge */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-semibold tabular-nums ${tpl.type === 'expense' ? 'text-expense' : 'text-income'}`}>
                        {tpl.type === 'expense' ? '-' : '+'}{formatAmount(tpl.amount, { minOne: true })}
                      </div>
                      <div className={`text-xs px-1.5 py-0.5 rounded mt-0.5 ${typeColor(tpl.type)}`}>
                        {typeLabel(tpl.type)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
