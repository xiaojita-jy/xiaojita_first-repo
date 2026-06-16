import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { exportBackup, importBackup } from '../utils/backup';

export default function Settings() {
  const navigate = useNavigate();
  const { categories, deleteCategory } = useCategories();
  const [deleteError, setDeleteError] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('keep_accounts_last_backup');
    if (stored) setLastBackup(stored);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      setDeleteError('');
    } catch (e: any) {
      setDeleteError(e.message);
    }
  };

  const handleExport = async () => {
    try {
      await exportBackup();
      const now = new Date().toLocaleString('zh-CN');
      localStorage.setItem('keep_accounts_last_backup', now);
      setLastBackup(now);
      setImportMsg('导出成功');
    } catch {
      setImportMsg('导出失败，请重试');
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
    <div className="px-4 py-6">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">我的</h1>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <button onClick={() => navigate('/budget')} className="w-full flex items-center justify-between py-2">
          <span className="text-sm text-gray-800">💰 预算设置</span>
          <span className="text-gray-400">›</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-medium text-gray-800 mb-3">分类管理</h2>
        {deleteError && <p className="text-red-500 text-xs mb-2">{deleteError}</p>}
        <div className="space-y-2">
          {categories.filter(c => !c.parentId).map(cat => (
            <div key={cat.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span>{cat.icon} {cat.name}</span>
              <button onClick={() => handleDelete(cat.id)} className="text-xs text-red-400">删除</button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-medium text-gray-800 mb-3">数据管理</h2>
        {importMsg && (
          <p className={`text-xs mb-2 ${importMsg.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>{importMsg}</p>
        )}
        {lastBackup && <p className="text-xs text-gray-400 mb-3">上次备份：{lastBackup}</p>}
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium">📤 导出备份</button>
          <button onClick={handleImport} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">📥 恢复备份</button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-sm font-medium text-gray-800 mb-2">关于</h2>
        <p className="text-xs text-gray-400">记账 v1.0.0 — 本地存储，你的数据只在你手里。</p>
      </div>
    </div>
  );
}
