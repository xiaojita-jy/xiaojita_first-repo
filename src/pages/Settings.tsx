import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { exportBackup, importBackup } from '../utils/backup';
import { exportCSV } from '../utils/csv';
import { formatBackupTime, generateId } from '../utils/format';
import ConfirmDialog from '../components/ConfirmDialog';
import CategoryForm from '../components/CategoryForm';
import type { Category } from '../models';

export default function Settings() {
  const navigate = useNavigate();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [deleteError, setDeleteError] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [addForm, setAddForm] = useState<{ parentId?: string; type: 'expense' | 'income' } | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem('keep_accounts_last_backup');
    if (stored) setLastBackup(stored);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      // 检查是否有子分类
      const subs = categories.filter(c => c.parentId === deleteTarget);
      if (subs.length > 0) {
        setDeleteError('请先删除该分类下的子分类');
        setDeleteTarget(null);
        return;
      }
      await deleteCategory(deleteTarget);
      setDeleteError('');
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(e.message);
      setDeleteTarget(null);
    }
  };

  const handleAddCategory = async (data: { name: string; icon: string; type: 'expense' | 'income' }) => {
    if (addForm?.parentId) {
      // 子分类：order 基于同级子分类
      const siblings = categories.filter(c => c.parentId === addForm.parentId);
      const maxOrder = siblings.reduce((max, c) => Math.max(max, c.order), 0);
      await addCategory({
        id: generateId(),
        name: data.name,
        type: data.type,
        icon: data.icon,
        order: maxOrder + 1,
        parentId: addForm.parentId,
      });
    } else {
      // 一级分类
      const sameType = categories.filter(c => c.type === data.type && !c.parentId);
      const maxOrder = sameType.reduce((max, c) => Math.max(max, c.order), 0);
      await addCategory({
        id: generateId(),
        name: data.name,
        type: data.type,
        icon: data.icon,
        order: maxOrder + 1,
      });
    }
    setAddForm(null);
  };

  const handleUpdateCategory = async (data: { name: string; icon: string; type: 'expense' | 'income' }) => {
    if (!editingCategory) return;
    await updateCategory(editingCategory.id, { name: data.name, icon: data.icon });
    setEditingCategory(null);
  };

  const handleExport = async () => {
    try {
      await exportBackup();
      const now = new Date().toISOString();
      localStorage.setItem('keep_accounts_last_backup', now);
      setLastBackup(now);
      setImportMsg('导出成功');
    } catch {
      setImportMsg('导出失败，请重试');
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportCSV();
      setImportMsg('CSV 导出成功');
    } catch {
      setImportMsg('CSV 导出失败，请重试');
    }
  };

  const handleImport = async () => {
    try {
      await importBackup();
      setImportMsg('导入成功，请刷新页面');
      setDeleteError('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setImportMsg(e.message || '导入失败');
    }
  };

  return (
    <div className="px-4 py-8">
      <h1 className="text-xl font-bold text-ink mb-6">我的</h1>

      <div className="card p-4 mb-4">
        <button onClick={() => navigate('/budget')} className="w-full flex items-center justify-between py-2">
          <span className="text-sm text-gray-800">💰 预算设置</span>
          <span className="text-gray-400">›</span>
        </button>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-ink">分类管理</h2>
          {!addForm && !editingCategory && (
            <button
              onClick={() => setAddForm({ type: 'expense' })}
              className="text-blue-500 text-sm"
            >
              + 新增
            </button>
          )}
        </div>
        {deleteError && <p className="text-red-500 text-xs mb-2">{deleteError}</p>}

        {addForm && !addForm.parentId && (
          <CategoryForm
            type={addForm.type}
            onSave={handleAddCategory}
            onCancel={() => setAddForm(null)}
          />
        )}

        <div className="space-y-1">
          {categories.filter(c => !c.parentId).map(cat => {
            const subs = categories.filter(c => c.parentId === cat.id);
            const isEditing = editingCategory?.id === cat.id;
            const isAddingSub = addForm?.parentId === cat.id;

            return (
              <div key={cat.id}>
                {/* 一级分类行 */}
                {isEditing ? (
                  <CategoryForm
                    category={cat}
                    onSave={handleUpdateCategory}
                    onCancel={() => setEditingCategory(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <button
                      onClick={() => subs.length > 0 && toggleExpand(cat.id)}
                      className="flex items-center gap-1"
                    >
                      <span className="text-xs text-gray-400 w-4">
                        {subs.length > 0 ? (expandedIds.has(cat.id) ? '▼' : '▶') : '　'}
                      </span>
                      <span>{cat.icon} {cat.name}</span>
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => setAddForm({ parentId: cat.id, type: cat.type })} className="text-xs text-green-500">+子分类</button>
                      <button onClick={() => setEditingCategory(cat)} className="text-xs text-blue-400">编辑</button>
                      <button onClick={() => setDeleteTarget(cat.id)} className="text-xs text-red-400">删除</button>
                    </div>
                  </div>
                )}

                {/* 新增子分类表单 */}
                {isAddingSub && (
                  <div className="pl-6">
                    <CategoryForm
                      type={cat.type}
                      hideType
                      onSave={handleAddCategory}
                      onCancel={() => setAddForm(null)}
                    />
                  </div>
                )}

                {/* 子分类列表（可折叠） */}
                {expandedIds.has(cat.id) && subs.map(sub => (
                  editingCategory?.id === sub.id ? (
                    <div key={sub.id} className="pl-6">
                      <CategoryForm
                        category={sub}
                        hideType
                        onSave={handleUpdateCategory}
                        onCancel={() => setEditingCategory(null)}
                      />
                    </div>
                  ) : (
                    <div key={sub.id} className="flex items-center justify-between py-1.5 pl-6 border-b border-gray-50">
                      <span className="text-sm text-gray-500">{sub.icon} {sub.name}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingCategory(sub)} className="text-xs text-blue-400">编辑</button>
                        <button onClick={() => setDeleteTarget(sub.id)} className="text-xs text-red-400">删除</button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-3">数据管理</h2>
        {importMsg && (
          <p className={`text-xs mb-2 ${importMsg.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>{importMsg}</p>
        )}
        {lastBackup && <p className="text-xs text-gray-400 mb-3">上次备份：{formatBackupTime(lastBackup)}</p>}
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium">📤 导出备份</button>
          <button onClick={() => setShowImportConfirm(true)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">📥 恢复备份</button>
        </div>
        <div className="mt-2">
          <button onClick={handleExportCSV} className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium">📊 导出 CSV</button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-ink mb-2">关于</h2>
        <p className="text-xs text-gray-400">记账 v1.0.0 — 本地存储，你的数据只在你手里。</p>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除分类"
        message="删除分类将无法恢复，确定要删除吗？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={showImportConfirm}
        title="导入数据"
        message="导入将覆盖当前所有数据，此操作不可撤销，确定继续吗？"
        onConfirm={() => { setShowImportConfirm(false); handleImport(); }}
        onCancel={() => setShowImportConfirm(false)}
        confirmText="确认导入"
      />
    </div>
  );
}
