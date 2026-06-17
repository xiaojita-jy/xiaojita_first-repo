import type { Category } from '../models';

interface Props {
  type: 'expense' | 'income';
  categories: Category[];
  subCategories: Category[];
  selectedCategoryId: string;
  selectedSubCategoryId?: string;
  onCategoryChange: (id: string) => void;
  onSubCategoryChange?: (id: string) => void;
}

export default function CategoryPicker({
  type,
  categories,
  subCategories,
  selectedCategoryId,
  selectedSubCategoryId,
  onCategoryChange,
  onSubCategoryChange,
}: Props) {
  const topCategories = categories.filter(c => c.type === type && !c.parentId);

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">
        {type === 'expense' ? '支出分类' : '收入分类'}
      </label>
      <div className="grid grid-cols-4 gap-3">
        {topCategories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategoryChange(cat.id)}
            className={`flex flex-col items-center py-3 px-1 rounded-xl border transition-colors overflow-hidden ${
              selectedCategoryId === cat.id
                ? 'bg-blue-50 border-blue-400'
                : 'bg-white border-border'
            }`}
          >
            {cat.color && (
              <div
                className="w-full h-1 -mt-3 mb-2"
                style={{ backgroundColor: cat.color }}
              />
            )}
            <span className="text-2xl">{cat.icon}</span>
            <span className="text-xs mt-1 text-ink">{cat.name}</span>
          </button>
        ))}
      </div>

      {subCategories.length > 0 && onSubCategoryChange && (
        <div className="mt-3 flex flex-wrap gap-2">
          {subCategories.map(sub => (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSubCategoryChange(sub.id)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                selectedSubCategoryId === sub.id
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-500 border-border'
              }`}
            >
              {sub.icon} {sub.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
