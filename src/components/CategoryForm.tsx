import { useState } from 'react';
import type { Category } from '../models';

const EMOJI_LIST = [
  '🍜', '🏠', '🚗', '🛒', '🎯', '🎁', '💊', '📌',
  '💰', '💼', '📥', '🎮', '✈️', '🐱', '🎓', '🎵',
  '🏋️', '📚', '☕', '🎬',
];

interface Props {
  category?: Category;
  type?: 'expense' | 'income';
  hideType?: boolean;
  onSave: (data: { name: string; icon: string; type: 'expense' | 'income' }) => Promise<void>;
  onCancel: () => void;
}

export default function CategoryForm({ category, type: initialType, hideType, onSave, onCancel }: Props) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? EMOJI_LIST[0]);
  const [type, setType] = useState<'expense' | 'income'>(category?.type ?? initialType ?? 'expense');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('请输入分类名称');
      return;
    }
    if (!icon) {
      setError('请选择图标');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), icon, type });
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4 mb-4">
      <h3 className="text-sm font-semibold text-ink mb-3">
        {isEdit ? '编辑分类' : '新增分类'}
      </h3>

      {!isEdit && !hideType && (
        <div className="flex bg-[#f0ece6] rounded-lg p-1 mb-4">
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                type === t ? 'bg-white text-ink shadow-sm' : 'text-gray-400'
              }`}
            >
              {t === 'expense' ? '支出' : '收入'}
            </button>
          ))}
        </div>
      )}

      <label className="block text-sm text-gray-400 mb-2">图标</label>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {EMOJI_LIST.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => setIcon(emoji)}
            className={`text-2xl py-2 rounded-lg border transition-colors ${
              icon === emoji
                ? 'bg-blue-50 border-blue-400'
                : 'bg-[#faf9f7] border-border'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <label className="block text-sm text-gray-400 mb-2">名称</label>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="分类名称"
        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm text-ink focus:outline-none focus:border-blue-400 bg-white mb-4"
      />

      {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-border text-gray-500 text-sm"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className={`flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
            saving || !name.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 active:bg-blue-600'
          }`}
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
