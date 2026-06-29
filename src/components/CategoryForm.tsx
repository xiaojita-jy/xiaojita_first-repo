import { useState } from 'react';
import type { Category } from '../models';

const EMOJI_LIST = [
  // 餐饮 (8)
  '🍜', '🍳', '🥩', '🍕', '🥤', '🍰', '🍲', '🍞',
  // 居住 + 家庭 (4)
  '🏠', '🛏️', '🧹', '🧺',
  // 交通 (6)
  '🚗', '🚌', '🚲', '🚄', '✈️', '🛵',
  // 购物 (6)
  '🛒', '👟', '🎒', '🛍️', '💻', '⌚',
  // 悦己 + 娱乐 (6)
  '🎯', '🎮', '🎸', '🎨', '🎲', '🎵',
  // 人情 + 庆祝 (4)
  '🎁', '🎂', '🎉', '🎊',
  // 医教 (5)
  '💊', '📖', '✏️', '🏥', '💉',
  // 收入 (4)
  '💰', '💼', '📥', '🏦',
  // 其他生活 (7)
  '📌', '🐱', '🐶', '🐰', '⚽', '🏀', '🏋️',
  // 其他 (4)
  '📚', '☕', '🎬', '💳',
];

const COLOR_PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#6B7280',
];

interface Props {
  category?: Category;
  type?: 'expense' | 'income';
  hideType?: boolean;
  onSave: (data: { name: string; icon: string; type: 'expense' | 'income'; color?: string }) => Promise<void>;
  onCancel: () => void;
}

export default function CategoryForm({ category, type: initialType, hideType, onSave, onCancel }: Props) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? EMOJI_LIST[0]);
  const [color, setColor] = useState<string | undefined>(category?.color);
  const [emojiInput, setEmojiInput] = useState('');
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
      await onSave({ name: name.trim(), icon, type, color });
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 从 emoji 输入框提取 emoji
  const handleEmojiInput = (value: string) => {
    setEmojiInput(value);
    // 尝试从输入内容中提取一个 emoji 作为图标
    const emojiMatch = value.match(/[\p{Emoji_Presentation}\p{Emoji}‍]/gu);
    if (emojiMatch) {
      setIcon(emojiMatch[0]);
    }
  };

  return (
    <div className="card p-4 mb-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        {isEdit ? '编辑分类' : '新增分类'}
      </h3>

      {!isEdit && !hideType && (
        <div className="flex bg-[rgba(20,30,44,0.6)] rounded-lg p-1 mb-4">
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                type === t ? 'bg-[rgba(30,41,59,0.4)] text-text-primary shadow-sm' : 'text-slate-400'
              }`}
            >
              {t === 'expense' ? '支出' : '收入'}
            </button>
          ))}
        </div>
      )}

      {/* 图标选择器：6列网格，54个 emoji */}
      <label className="block text-sm text-slate-400 mb-2">图标</label>
      <div className="grid grid-cols-6 gap-2 mb-3">
        {EMOJI_LIST.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => { setIcon(emoji); setEmojiInput(''); }}
            className={`text-xl py-1.5 rounded-lg border transition-colors ${
              icon === emoji
                ? 'bg-sky-950/30 border-accent'
                : 'bg-[rgba(20,30,44,0.5)] border-[rgba(71,85,105,0.25)]'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* 手动输入 emoji */}
      <label className="block text-sm text-slate-400 mb-2">或直接输入 emoji</label>
      <input
        type="text"
        value={emojiInput}
        onChange={e => handleEmojiInput(e.target.value)}
        placeholder="粘贴 emoji 或按 Win+."
        className="w-full px-4 py-2.5 rounded-xl border border-[rgba(71,85,105,0.25)] text-sm text-text-primary focus:outline-none focus:border-accent bg-[rgba(30,41,59,0.4)] mb-4"
      />

      {/* 颜色选择器：7列，14色 */}
      <label className="block text-sm text-slate-400 mb-2">颜色（可选）</label>
      <div className="grid grid-cols-7 gap-2 mb-4">
        {COLOR_PALETTE.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(color === c ? undefined : c)}
            className={`w-8 h-8 rounded-full mx-auto transition-all ${
              color === c ? 'ring-2 ring-offset-1 ring-accent scale-110' : 'hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      {/* 名称 */}
      <label className="block text-sm text-slate-400 mb-2">名称</label>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="分类名称"
        className="w-full px-4 py-2.5 rounded-xl border border-[rgba(71,85,105,0.25)] text-sm text-text-primary focus:outline-none focus:border-accent bg-[rgba(30,41,59,0.4)] mb-4"
      />

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-[rgba(71,85,105,0.25)] text-slate-300 text-sm"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className={`flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
            saving || !name.trim() ? 'bg-slate-700/50 cursor-not-allowed' : ''
          }`}
          style={saving || !name.trim() ? undefined : { background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
