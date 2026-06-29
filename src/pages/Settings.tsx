import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useTemplates } from '../hooks/useTemplates';
import { exportBackup, importBackup } from '../utils/backup';
import { exportCSV } from '../utils/csv';
import { formatBackupTime, generateId, formatAmount } from '../utils/format';
import ConfirmDialog from '../components/ConfirmDialog';
import CategoryForm from '../components/CategoryForm';
import type { Category } from '../models';

export default function Settings() {
  const navigate = useNavigate();
  const { categories, addCategory, updateCategory, deleteCategory, moveUp, moveDown } = useCategories();
  const { templates, update: updateTemplate, remove: removeTemplate, moveUp: moveTplUp, moveDown: moveTplDown } = useTemplates();
  const [editingTemplateName, setEditingTemplateName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [deleteTplTarget, setDeleteTplTarget] = useState<string | null>(null);
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

  const handleDeleteTemplate = async () => {
    if (!deleteTplTarget) return;
    await removeTemplate(deleteTplTarget);
    setDeleteTplTarget(null);
  };

  const handleAddCategory = async (data: { name: string; icon: string; type: 'expense' | 'income'; color?: string }) => {
    if (addForm?.parentId) {
      // 子分类：order 基于同级子分类
      const siblings = categories.filter(c => c.parentId === addForm.parentId);
      const maxOrder = siblings.reduce((max, c) => Math.max(max, c.order), 0);
      await addCategory({
        id: generateId(),
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
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
        color: data.color,
        order: maxOrder + 1,
      });
    }
    setAddForm(null);
  };

  const handleUpdateCategory = async (data: { name: string; icon: string; type: 'expense' | 'income'; color?: string }) => {
    if (!editingCategory) return;
    await updateCategory(editingCategory.id, { name: data.name, icon: data.icon, color: data.color });
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
    <div className="px-5 pt-7 pb-8">
      <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-6">我的</h1>

      <div className="card p-4 mb-4">
        <button onClick={() => navigate('/budget')} className="w-full flex items-center justify-between py-2">
          <span className="text-sm text-slate-200">💰 预算设置</span>
          <span className="text-slate-500">›</span>
        </button>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-slate-200">分类管理</h2>
          {!addForm && !editingCategory && (
            <button
              onClick={() => setAddForm({ type: 'expense' })}
              className="text-accent text-sm"
            >
              + 新增
            </button>
          )}
        </div>
        {deleteError && <p className="text-red-400 text-xs mb-2">{deleteError}</p>}

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
                  <div className="flex items-center justify-between py-2 border-b border-[rgba(71,85,105,0.15)]">
                    <button
                      onClick={() => subs.length > 0 && toggleExpand(cat.id)}
                      className="flex items-center gap-1"
                    >
                      <span className="text-xs text-slate-500 w-4">
                        {subs.length > 0 ? (expandedIds.has(cat.id) ? '▼' : '▶') : '　'}
                      </span>
                      <span>
                        {cat.color && (
                          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle" style={{ backgroundColor: cat.color }} />
                        )}
                        {cat.icon} {cat.name}
                      </span>
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => setAddForm({ parentId: cat.id, type: cat.type })} className="text-xs text-emerald-400">+子分类</button>
                      <button onClick={() => setEditingCategory(cat)} className="text-xs text-accent">编辑</button>
                      <button onClick={() => setDeleteTarget(cat.id)} className="text-xs text-red-400">删除</button>
                      {(() => {
                        const sibs = categories
                          .filter(c => c.parentId === cat.parentId && c.type === cat.type)
                          .sort((a, b) => a.order - b.order);
                        const idx = sibs.findIndex(c => c.id === cat.id);
                        return (
                          <>
                            <button
                              onClick={() => moveUp(cat.id)}
                              disabled={idx <= 0}
                              className={`text-xs ${idx <= 0 ? 'text-slate-600 cursor-default' : 'text-slate-400 hover:text-ink cursor-pointer'}`}
                              title="上移"
                            >↑</button>
                            <button
                              onClick={() => moveDown(cat.id)}
                              disabled={idx >= sibs.length - 1}
                              className={`text-xs ${idx >= sibs.length - 1 ? 'text-slate-600 cursor-default' : 'text-slate-400 hover:text-ink cursor-pointer'}`}
                              title="下移"
                            >↓</button>
                          </>
                        );
                      })()}
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
                    <div key={sub.id} className="flex items-center justify-between py-1.5 pl-6 border-b border-[rgba(71,85,105,0.15)]">
                      <span className="text-sm text-slate-400">
                        {sub.color && (
                          <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: sub.color }} />
                        )}
                        {sub.icon} {sub.name}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingCategory(sub)} className="text-xs text-accent">编辑</button>
                        <button onClick={() => setDeleteTarget(sub.id)} className="text-xs text-red-400">删除</button>
                        {(() => {
                          const sibs = subs.sort((a, b) => a.order - b.order);
                          const idx = sibs.findIndex(c => c.id === sub.id);
                          return (
                            <>
                              <button
                                onClick={() => moveUp(sub.id)}
                                disabled={idx <= 0}
                                className={`text-xs ${idx <= 0 ? 'text-slate-600 cursor-default' : 'text-slate-400 hover:text-ink cursor-pointer'}`}
                                title="上移"
                              >↑</button>
                              <button
                                onClick={() => moveDown(sub.id)}
                                disabled={idx >= sibs.length - 1}
                                className={`text-xs ${idx >= sibs.length - 1 ? 'text-slate-600 cursor-default' : 'text-slate-400 hover:text-ink cursor-pointer'}`}
                                title="下移"
                              >↓</button>
                            </>
                          );
                        })()}
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
        <h2 className="text-sm font-semibold text-slate-200 mb-3">模板管理</h2>
        {templates.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-2">暂无模板，记一笔时可保存为模板</p>
        ) : (
          <div className="space-y-1">
            {[...templates].sort((a, b) => a.order - b.order).map((tpl, idx, arr) => {
              const cat = categories.find(c => c.id === tpl.categoryId);
              const isEditingName = editingTemplateName === tpl.id;

              // 分类路径
              let catPath: string;
              if (tpl.subCategoryId) {
                const sub = categories.find(c => c.id === tpl.subCategoryId);
                const parent = sub ? categories.find(c => c.id === sub.parentId) : undefined;
                catPath = parent && sub ? `${parent.name}·${sub.name}` : (sub?.name || '未知分类');
              } else if (cat?.parentId) {
                const parent = categories.find(c => c.id === cat.parentId);
                catPath = parent ? `${parent.name}·${cat.name}` : (cat?.name || '未知分类');
              } else {
                catPath = cat?.name || '未知分类';
              }

              // 图标
              const displayIcon = tpl.subCategoryId
                ? (categories.find(c => c.id === tpl.subCategoryId)?.icon || cat?.icon || '📌')
                : (cat?.icon || '📌');

              return (
                <div key={tpl.id} className="flex items-center justify-between py-2 border-b border-[rgba(71,85,105,0.15)]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm shrink-0">{displayIcon}</span>
                    {isEditingName ? (
                      <input
                        className="text-sm border border-accent/50 rounded px-1.5 py-0.5 w-24 shrink-0 bg-[rgba(30,41,59,0.4)]"
                        value={editNameValue}
                        onChange={e => setEditNameValue(e.target.value)}
                        onBlur={() => {
                          if (editNameValue && editNameValue !== tpl.name) {
                            updateTemplate(tpl.id, { name: editNameValue });
                          }
                          setEditingTemplateName(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingTemplateName(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-ink truncate">{tpl.name}</span>
                    )}
                    <span className="text-xs text-slate-500 truncate">{catPath}</span>
                    <span className={`text-xs font-medium tabular-nums shrink-0 ${tpl.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {tpl.type === 'expense' ? '-' : '+'}{formatAmount(tpl.amount, { minOne: true })}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${tpl.type === 'expense' ? 'bg-red-950/30 text-red-400' : 'bg-emerald-950/30 text-emerald-400'}`}>
                      {tpl.type === 'expense' ? '支出' : '收入'}
                    </span>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => { setEditingTemplateName(tpl.id); setEditNameValue(tpl.name); }}
                      className="text-xs text-accent"
                      title="编辑名称"
                    >✏️</button>
                    <button onClick={() => setDeleteTplTarget(tpl.id)} className="text-xs text-red-400" title="删除">🗑️</button>
                    <button
                      onClick={() => moveTplUp(tpl.id)}
                      disabled={idx <= 0}
                      className={`text-xs ${idx <= 0 ? 'text-slate-600 cursor-default' : 'text-slate-400 hover:text-ink cursor-pointer'}`}
                      title="上移"
                    >↑</button>
                    <button
                      onClick={() => moveTplDown(tpl.id)}
                      disabled={idx >= arr.length - 1}
                      className={`text-xs ${idx >= arr.length - 1 ? 'text-slate-600 cursor-default' : 'text-slate-400 hover:text-ink cursor-pointer'}`}
                      title="下移"
                    >↓</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">数据管理</h2>
        {importMsg && (
          <p className={`text-xs mb-2 ${importMsg.includes('成功') ? 'text-emerald-400' : 'text-red-400'}`}>{importMsg}</p>
        )}
        {lastBackup && <p className="text-xs text-slate-500 mb-3">上次备份：{formatBackupTime(lastBackup)}</p>}
        <div className="flex gap-3">
          <button onClick={handleExport} style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }} className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium">📤 导出备份</button>
          <button onClick={() => setShowImportConfirm(true)} className="flex-1 py-2.5 bg-[rgba(71,85,105,0.2)] text-slate-300 rounded-xl text-sm font-medium">📥 恢复备份</button>
        </div>
        <div className="mt-2">
          <button onClick={handleExportCSV} className="w-full py-2.5 bg-transparent border border-[rgba(71,85,105,0.35)] text-slate-300 rounded-xl text-sm font-medium">📊 导出 CSV</button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">关于</h2>
        <p className="text-xs text-slate-500">记账 v1.0.0 — 本地存储，你的数据只在你手里。</p>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除分类"
        message="删除分类将无法恢复，确定要删除吗？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTplTarget}
        title="删除模板"
        message="确定要删除该模板吗？"
        onConfirm={handleDeleteTemplate}
        onCancel={() => setDeleteTplTarget(null)}
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
