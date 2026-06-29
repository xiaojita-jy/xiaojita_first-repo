import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AmountInput from '../components/AmountInput';
import CategoryPicker from '../components/CategoryPicker';
import PaymentPicker from '../components/PaymentPicker';
import TemplatePicker from '../components/TemplatePicker';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useBudget } from '../hooks/useBudget';
import { useTemplates } from '../hooks/useTemplates';
import { parseAmountToCents, getToday, formatAmount } from '../utils/format';
import { showToast } from '../utils/toast';
import type { PaymentMethod } from '../models';

export default function AddRecord() {
  const navigate = useNavigate();
  const { expenseCategories, incomeCategories, loading: catLoading, error: catError, getSubs, categories: allCategories } = useCategories();
  const { add } = useTransactions();
  const { checkAlerts } = useBudget();
  const { templates, add: addTemplate, loading: tplLoading } = useTemplates();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wechat');
  const [date, setDate] = useState(getToday());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = type === 'expense' ? expenseCategories : incomeCategories;
  const subCategories = useMemo(
    () => (categoryId ? getSubs(categoryId) : []),
    [categoryId, getSubs]
  );

  const handleSave = async () => {
    setError('');
    const amount = parseAmountToCents(amountStr);
    if (amount <= 0) {
      setError('请输入金额');
      return;
    }
    if (!categoryId) {
      setError('请选择分类');
      return;
    }
    if (amount > 99_999_99) {
      setError('金额过大，请核实');
      return;
    }

    setSaving(true);
    try {
      await add({
        type,
        amount,
        categoryId: subCategoryId || categoryId,
        subCategoryId: subCategoryId || undefined,
        paymentMethod,
        date,
        note: note || undefined,
      });
      setAmountStr('');
      setCategoryId('');
      setSubCategoryId(undefined);
      setNote('');
      // 预算超支检查（保存后、跳转前）
      try {
        const alerts = await checkAlerts(allCategories);
        for (const alert of alerts) {
          if (alert.level === 'danger') {
            showToast(`🔴 「${alert.categoryName}」已超支 ${formatAmount(Math.abs(alert.remaining), { minOne: true })}`, 'danger');
          } else {
            showToast(`⚠️ 「${alert.categoryName}」预算已用 ${alert.percentage}%，剩 ${formatAmount(alert.remaining, { minOne: true })}`, 'warning');
          }
        }
      } catch {
        // 预算检查失败不影响主流程
      }
      setError('');
      setTimeout(() => navigate('/records'), 300);
    } catch {
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectTemplate = (tpl: typeof templates[0]) => {
    setType(tpl.type);
    setAmountStr(formatAmount(tpl.amount));
    // If categoryId is a sub-category, map parent→categoryId, sub→subCategoryId
    const cat = allCategories.find(c => c.id === tpl.categoryId);
    if (cat?.parentId) {
      setCategoryId(cat.parentId);
      setSubCategoryId(tpl.categoryId);
    } else {
      setCategoryId(tpl.categoryId);
      setSubCategoryId(tpl.subCategoryId);
    }
    setPaymentMethod(tpl.paymentMethod);
    setNote(tpl.note || '');
    setShowTemplatePicker(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !categoryId) return;
    const amount = parseAmountToCents(amountStr);
    if (amount <= 0) return;
    try {
      await addTemplate(templateName.trim(), {
        type,
        amount,
        categoryId: subCategoryId || categoryId,
        subCategoryId: subCategoryId || undefined,
        paymentMethod,
        note: note || undefined,
      });
      setShowSaveTemplate(false);
      setTemplateName('');
      // 模板保存成功，对话框关闭即是反馈
    } catch {
      showToast('模板保存失败', 'danger');
    }
  };

  const canSave = amountStr && categoryId && !saving;

  return (
    <div className="px-5 pt-7 pb-8">
      <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-6">记一笔</h1>

      <div className="flex rounded-xl p-1 mb-5" style={{ background: 'rgba(20,30,44,0.6)' }}>
        {(['expense', 'income'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setType(t); setCategoryId(''); setSubCategoryId(undefined); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              type === t ? 'text-text-primary' : 'text-slate-500'
            }`}
            style={type === t ? { background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(56,189,248,0.3)' } : undefined}
          >
            {t === 'expense' ? '💰 支出' : '💵 收入'}
          </button>
        ))}
      </div>

      <AmountInput value={amountStr} onChange={setAmountStr} />

      <div className="space-y-5 mt-6">
        {catLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">加载分类中...</p>
        ) : catError ? (
          <p className="text-sm text-red-500 text-center py-4">分类加载失败：{catError}</p>
        ) : (
          <CategoryPicker
            type={type}
            categories={categories}
            subCategories={subCategories}
            selectedCategoryId={categoryId}
            selectedSubCategoryId={subCategoryId}
            onCategoryChange={id => { setCategoryId(id); setSubCategoryId(undefined); }}
            onSubCategoryChange={setSubCategoryId}
          />
        )}

        <div>
          <label className="block text-sm text-slate-400 mb-2">日期</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="input-dark"
          />
        </div>

        <PaymentPicker value={paymentMethod} onChange={setPaymentMethod} />

        <div>
          <label className="block text-sm text-slate-400 mb-2">备注（选填）</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="例如：和同事AA午餐"
            className="input-dark"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}

      {/* 模板操作 */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setShowTemplatePicker(true)}
          disabled={tplLoading}
          className="btn-secondary flex-1"
        >
          📋 使用模板
        </button>
        <button
          onClick={() => { setTemplateName(''); setShowSaveTemplate(true); }}
          disabled={!categoryId || !amountStr}
          className={
            categoryId && amountStr
              ? 'btn-secondary flex-1'
              : 'flex-1 py-2.5 rounded-xl border border-[rgba(71,85,105,0.2)] text-slate-600 text-sm font-medium cursor-not-allowed'
          }
        >
          💾 保存为模板
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className={`w-full mt-6 py-3 rounded-xl text-white font-medium transition-colors ${
          canSave ? 'btn-primary' : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
        }`}
      >
        {saving ? '保存中...' : '✔️ 保存记账'}
      </button>

      {/* 模板选择弹窗 */}
      {showTemplatePicker && (
        <TemplatePicker
          templates={templates}
          allCategories={allCategories}
          onSelect={handleSelectTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {/* 保存模板命名弹窗 */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowSaveTemplate(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative rounded-2xl border border-[rgba(71,85,105,0.3)] px-6 py-5 w-80 shadow-xl"
            style={{ background: 'rgba(20,30,44,0.95)', backdropFilter: 'blur(20px)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-200 mb-3">保存为模板</h3>
            <p className="text-xs text-slate-400 mb-3">请输入模板名称：</p>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="例如：午餐外卖"
              className="input-dark mb-4"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveTemplate();
                if (e.key === 'Escape') setShowSaveTemplate(false);
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveTemplate(false)}
                className="flex-1 py-2 rounded-xl bg-[rgba(71,85,105,0.2)] text-slate-300 text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
                className={`flex-1 py-2 rounded-xl text-white text-sm font-medium ${
                  templateName.trim() ? '' : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                }`}
                style={templateName.trim() ? { background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' } : undefined}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
