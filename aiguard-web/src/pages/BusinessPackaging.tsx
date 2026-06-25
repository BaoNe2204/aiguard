import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, Check, ChevronDown, ChevronLeft, ChevronRight, Edit, Layers, PackageCheck,
  Plus, Save, Sparkles, X, Tag, DollarSign, Users, Monitor,
  Shield, Calendar, Award, Info, Globe, Activity, Trash2
} from 'lucide-react';
import { businessApi } from '../api/business';
import { platformApi } from '../api/platform';
import { useAuth } from '../contexts/AuthContext';
import type { ProductPlanResponse } from '../api/platform';

const featureRows = [
  ['Browser Extension', true, true, true, true, false],
  ['Quét prompt trên ChatGPT/Gemini/Claude', true, true, true, true, false],
  ['Che dữ liệu nhạy cảm', true, true, true, true, false],
  ['Workflow phê duyệt', false, false, true, true, true],
  ['Báo cáo chặn nhầm', false, false, true, true, true],
  ['Quét file PDF/Word/Excel/source', false, 'Giới hạn', true, true, false],
  ['OCR ảnh, PDF scan, screenshot', false, false, 'Tùy chọn', true, false],
  ['Exact Data Match', false, false, 'Cơ bản', 'Nâng cao', false],
  ['Shadow AI Discovery', false, false, true, true, false],
  ['Quản lý thiết bị', false, 'Cơ bản', true, true, false],
  ['Tích hợp SIEM', false, false, false, true, true],
  ['Xuất báo cáo PDF/Excel', false, false, true, true, true],
  ['Incident Management', false, false, true, true, true],
  ['SSO doanh nghiệp', false, false, 'Tùy chọn', true, true],
  ['Kiểm soát tool-call của AI Agent', false, false, false, false, true]
] as const;

type AddStep = 'info' | 'pricing' | 'features';

export const BusinessPackaging: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === 'PlatformAdmin';
  const canBuyPlan = user?.role === 'TenantOwner';
  const [plans, setPlans] = useState<ProductPlanResponse[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [addStep, setAddStep] = useState<AddStep>('info');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletePlanConfirm, setDeletePlanConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const createEmptyNewPlan = () => ({
    code: '',
    name: '',
    description: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'VND',
    includedUsers: 10,
    includedDevices: 20,
    maxAgents: 0,
    features: ['Chính sách bảo mật AI cơ bản'],
    isActive: true,
    displayOrder: (plans[plans.length - 1]?.displayOrder ?? 0) + 1
  });

  const [newPlan, setNewPlan] = useState(createEmptyNewPlan);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = isPlatformAdmin ? await platformApi.getPlans() : await businessApi.getPlans();
      const sorted = res.sort((a, b) => a.displayOrder - b.displayOrder);
      setPlans(sorted);
      if (sorted.length > 0 && !selectedPlanId) {
        setSelectedPlanId(sorted[0].id);
      }
    } catch (e: any) {
      setNotice({ type: 'error', message: e?.message || 'Không thể tải danh sách gói dịch vụ.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [isPlatformAdmin]);

  const validatePlan = (plan: ProductPlanResponse | typeof newPlan): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!plan.name?.trim()) errs.name = 'Tên gói không được để trống';
    if (!plan.code?.trim()) errs.code = 'Mã gói không được để trống';
    if (plan.monthlyPrice < 0) errs.monthlyPrice = 'Giá không được âm';
    if (plan.yearlyPrice < 0) errs.yearlyPrice = 'Giá không được âm';
    if (plan.includedUsers <= 0) errs.includedUsers = 'Phải có ít nhất 1 user';
    if (plan.includedDevices <= 0) errs.includedDevices = 'Phải có ít nhất 1 thiết bị';
    if (plan.maxAgents < 0) errs.maxAgents = 'Số agent không được âm';
    return errs;
  };

  const handleCreate = async () => {
    if (!isPlatformAdmin) return;
    const errs = validatePlan(newPlan);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setAddStep('info'); // Quay lại bước 1 hiển thị lỗi nếu có
      return;
    }
    setSaving(true);
    try {
      await platformApi.createPlan(newPlan);
      setNotice({ type: 'success', message: `Đã tạo gói ${newPlan.name}.` });
      setShowAddForm(false);
      setErrors({});
      setAddStep('info');
      setNewPlan(createEmptyNewPlan());
      await loadPlans();
    } catch (e: any) {
      setNotice({ type: 'error', message: e?.message || 'Không thể tạo gói dịch vụ.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!isPlatformAdmin || !editingPlanId) return;
    const errs = validatePlan(newPlan);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setAddStep('info');
      return;
    }
    setSaving(true);
    try {
      await platformApi.updatePlan(editingPlanId, newPlan);
      setNotice({ type: 'success', message: `Đã cập nhật gói ${newPlan.name}.` });
      setShowAddForm(false);
      setEditingPlanId(null);
      setErrors({});
      setAddStep('info');
      setNewPlan(createEmptyNewPlan());
      await loadPlans();
    } catch (e: any) {
      setNotice({ type: 'error', message: e?.message || 'Không thể cập nhật gói dịch vụ.' });
    } finally {
      setSaving(false);
    }
  };

  const openAddForm = () => {
    setNewPlan(createEmptyNewPlan());
    setEditingPlanId(null);
    setErrors({});
    setAddStep('info');
    setShowAddForm(true);
  };

  const openEditForm = (targetPlan: ProductPlanResponse) => {
    setNewPlan({
      code: targetPlan.code,
      name: targetPlan.name,
      description: targetPlan.description ?? '',
      monthlyPrice: targetPlan.monthlyPrice,
      yearlyPrice: targetPlan.yearlyPrice,
      currency: targetPlan.currency,
      includedUsers: targetPlan.includedUsers,
      includedDevices: targetPlan.includedDevices,
      maxAgents: targetPlan.maxAgents,
      features: targetPlan.features ?? [],
      isActive: targetPlan.isActive,
      displayOrder: targetPlan.displayOrder
    });
    setEditingPlanId(targetPlan.id);
    setErrors({});
    setAddStep('info');
    setShowAddForm(true);
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    setEditingPlanId(null);
    setErrors({});
    setAddStep('info');
  };

  const plan = plans.find(p => p.id === selectedPlanId) ?? plans[0];

  const handleBuyPlan = async (targetPlan = plan) => {
    if (!targetPlan || !canBuyPlan) return;
    setBuying(true);
    try {
      const tenant = await businessApi.getTenant();
      const order = await businessApi.createOrder({
        tenantId: tenant.id,
        productPlanId: targetPlan.id,
        billingCycle: 'Monthly',
        userQuantity: targetPlan.includedUsers,
        deviceQuantity: targetPlan.includedDevices,
        discountAmount: 0,
        taxPercent: 10,
        notes: `TenantOwner selected ${targetPlan.name} from package page.`
      });
      navigate('/app/business/payment', {
        state: { order, plan: targetPlan, purchaseMonths: 1 }
      });
    } catch (e: any) {
      setNotice({ type: 'error', message: e?.message || 'Không thể tạo đơn mua gói.' });
    } finally {
      setBuying(false);
    }
  };

  const handleDeletePlan = (id: string, name: string) => {
    setDeletePlanConfirm({ id, name });
  };

  const newYearlyTotal = newPlan.yearlyPrice * newPlan.includedUsers;

  return (
    <div className="business-page">
      <div className="page-header business-page-header">
        <div>
          <h1>Đóng gói & Bảng giá</h1>
          <p className="subtitle">
            {isPlatformAdmin
              ? 'Quản lý gói dịch vụ, giá bán và cách hiển thị bảng so sánh cho khách hàng.'
              : 'So sánh nhanh các gói, ước tính chi phí và tạo đơn mua trong một luồng gọn hơn.'}
          </p>
        </div>
        {isPlatformAdmin && <div className="business-header-actions">
          <button className="btn-primary" onClick={openAddForm}><Plus size={15} /> Tạo gói mới</button>
        </div>}
      </div>

      {notice && (
        <div className={`business-inline-alert ${notice.type === 'success' ? 'success' : 'danger'}`}>
          <span>{notice.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}</span>
          <strong>{notice.message}</strong>
          <button type="button" onClick={() => setNotice(null)}><X size={14} /></button>
        </div>
      )}

      {isPlatformAdmin && showAddForm && (
        <AddPlanModal
          draft={newPlan}
          onChange={setNewPlan}
          onClose={closeAddForm}
          onSave={editingPlanId ? handleUpdate : handleCreate}
          step={addStep}
          setStep={setAddStep}
          errors={errors}
          saving={saving}
          yearlyTotal={newYearlyTotal}
          mode={editingPlanId ? 'edit' : 'create'}
        />
      )}

      {isPlatformAdmin && deletePlanConfirm && (
        <DeleteConfirmModal
          name={deletePlanConfirm.name}
          onClose={() => setDeletePlanConfirm(null)}
          saving={deleting}
          onConfirm={async () => {
            setDeleting(true);
            try {
              await platformApi.deletePlan(deletePlanConfirm.id);
              setNotice({ type: 'success', message: `Đã xóa gói dịch vụ ${deletePlanConfirm.name} thành công.` });
              setDeletePlanConfirm(null);
              await loadPlans();
            } catch (e: any) {
              setNotice({ type: 'error', message: e?.message || 'Không thể xóa gói dịch vụ.' });
            } finally {
              setDeleting(false);
            }
          }}
        />
      )}

      {loading ? (
        <div className="p-8 text-center">Đang tải cấu hình gói...</div>
      ) : (
        <section className="business-section pricing-showcase">
          <div className="section-title pricing-section-title">
            <div>
              <PackageCheck size={18} />
              <h2>{isPlatformAdmin ? 'Danh mục gói dịch vụ' : 'Chọn gói phù hợp'}</h2>
            </div>
            <span>{plans.length} gói đang hiển thị</span>
          </div>
          <div className="business-plan-grid">
            {plans.map(item => (
              <div key={item.id} className={`business-plan-card pricing-plan-card card glass ${selectedPlanId === item.id ? 'active' : ''} relative`}>
                {isPlatformAdmin && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditForm(item); }}
                      className="plan-edit-button"
                      title="Chỉnh sửa gói"
                      aria-label={`Chỉnh sửa gói ${item.name}`}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePlan(item.id, item.name); }}
                      className="plan-delete-button"
                      title="Xóa gói"
                      aria-label={`Xóa gói ${item.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}

                <div className="cursor-pointer plan-card-body" onClick={() => setSelectedPlanId(item.id)}>
                  <div className="plan-badge-row">
                    <span className="plan-badge">{item.code}</span>
                    {isRecommendedPlan(item) && <span className="plan-badge recommended">Phổ biến</span>}
                    {!item.isActive && <span className="plan-badge !bg-red-500/20 !text-red-300 border-red-500/30">Đã tắt</span>}
                  </div>
                  <div className="plan-head">
                    <span>{item.name}</span>
                  </div>
                  <div className="plan-price">
                    <strong>{item.monthlyPrice > 0 ? formatVnd(item.monthlyPrice * item.includedUsers) : 'Miễn phí'}</strong>
                    <span>{item.monthlyPrice > 0 ? '/ tháng' : 'Dùng thử sản phẩm'}</span>
                  </div>
                  <p>{item.description || 'Chưa có mô tả'}</p>
                  <div className="plan-metrics">
                    <span>{item.includedUsers} users</span>
                    <span>{item.includedDevices} devices</span>
                    <span>{item.maxAgents} agents</span>
                  </div>
                  <ul>
                    {item.features?.slice(0, 5).map(feature => <li key={feature}><Check size={13} /> {feature}</li>)}
                    {item.features && item.features.length > 5 && (
                      <li className="text-xs text-gray-500">+{item.features.length - 5} tính năng khác</li>
                    )}
                  </ul>
                  {canBuyPlan && (
                    <button
                      className={selectedPlanId === item.id ? 'btn-primary business-buy-button' : 'btn-secondary business-buy-button'}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedPlanId(item.id);
                        void handleBuyPlan(item);
                      }}
                      disabled={buying}
                    >
                      {buying && selectedPlanId === item.id ? 'Đang tạo đơn...' : 'Mua gói'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {plans.length === 0 && <div className="text-gray-400 p-4">Chưa có gói dịch vụ nào. Hãy tạo mới.</div>}
          </div>
        </section>
      )}

      <section className="business-section card glass pricing-compare-section">
        <div className="section-title pricing-section-title">
          <div>
            <Layers size={18} />
            <h2>So sánh tính năng</h2>
          </div>
          <span>Dễ nhìn để tư vấn khách hàng</span>
        </div>
        <div className="business-table-wrap">
          <table className="business-table">
            <thead>
              <tr>
                <th>Tính năng</th>
                <th>Dùng thử</th>
                <th>Starter</th>
                <th>Professional</th>
                <th>Enterprise</th>
                <th>Agent Add-on</th>
              </tr>
            </thead>
            <tbody>
              {featureRows.map(row => (
                <tr key={row[0] as string}>
                  <td><strong>{row[0] as string}</strong></td>
                  {row.slice(1).map((value, index) => <td key={`${row[0]}-${index}`}>{renderFeature(value as any)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// =================================================================
// Field & helpers
// =================================================================
const Field: React.FC<{ label: string; required?: boolean; error?: string; colSpan?: number; children: React.ReactNode }> =
  ({ label, required, error, colSpan, children }) => (
    <label className={`package-field block ${colSpan === 2 ? 'col-span-2' : ''}`}>
      <span className="package-field-label text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        {label}
        {required && <span className="text-rose-400 text-sm">*</span>}
      </span>
      {children}
      {error && (
        <span className="package-field-error text-xs text-rose-400 mt-1.5 flex items-center gap-1.5 animate-pulse">
          <AlertCircle size={12} /> {error}
        </span>
      )}
    </label>
  );

const IconInput: React.FC<{
  icon: React.ReactNode;
  error?: string;
  theme?: 'indigo' | 'emerald';
  [key: string]: any;
}> = ({ icon, error, theme = 'indigo', ...props }) => {
  const focusRingCls = theme === 'emerald'
    ? 'focus:border-emerald-500 focus:ring-emerald-500/20'
    : 'focus:border-indigo-500 focus:ring-indigo-500/20';

  return (
    <div className="package-input-wrap relative mt-1.5">
      <div className="package-input-icon absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
        {icon}
      </div>
      <input
        className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-950/60 border ${
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
            : `border-slate-800/80 ${focusRingCls}`
        } text-white placeholder-slate-600 focus:outline-none focus:ring-4 transition-all duration-200`}
        style={{ backgroundColor: '#09090b' }}
        {...props}
      />
    </div>
  );
};

const IconSelect: React.FC<{
  icon: React.ReactNode;
  theme?: 'indigo' | 'emerald';
  children: React.ReactNode;
  [key: string]: any;
}> = ({ icon, theme = 'indigo', children, ...props }) => {
  const focusRingCls = theme === 'emerald'
    ? 'focus:border-emerald-500 focus:ring-emerald-500/20'
    : 'focus:border-indigo-500 focus:ring-indigo-500/20';

  return (
    <div className="package-input-wrap relative mt-1.5">
      <div className="package-input-icon absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
        {icon}
      </div>
      <select
        className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-slate-950/60 border border-slate-800/80 text-white focus:outline-none focus:ring-4 transition-all duration-200 appearance-none ${focusRingCls}`}
        style={{ backgroundColor: '#09090b' }}
        {...props}
      >
        {children}
      </select>
      <div className="package-select-caret absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
        <ChevronDown size={14} />
      </div>
    </div>
  );
};

const IconTextarea: React.FC<{
  icon: React.ReactNode;
  error?: string;
  theme?: 'indigo' | 'emerald';
  [key: string]: any;
}> = ({ icon, error, theme = 'indigo', ...props }) => {
  const focusRingCls = theme === 'emerald'
    ? 'focus:border-emerald-500 focus:ring-emerald-500/20'
    : 'focus:border-indigo-500 focus:ring-indigo-500/20';

  return (
    <div className="package-input-wrap package-textarea-wrap relative mt-1.5">
      <div className="package-input-icon absolute top-3 left-3.5 pointer-events-none text-slate-500">
        {icon}
      </div>
      <textarea
        className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-950/60 border ${
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
            : `border-slate-800/80 ${focusRingCls}`
        } text-white placeholder-slate-600 focus:outline-none focus:ring-4 transition-all duration-200`}
        style={{ backgroundColor: '#09090b' }}
        {...props}
      />
    </div>
  );
};

const FeatureTags: React.FC<{
  features: string[];
  onChange: (next: string[]) => void;
  theme?: 'indigo' | 'emerald';
}> = ({ features, onChange, theme = 'indigo' }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (features.includes(v)) { setDraft(''); return; }
    onChange([...features, v]);
    setDraft('');
  };
  const remove = (idx: number) => onChange(features.filter((_, i) => i !== idx));

  const focusRingCls = theme === 'emerald'
    ? 'focus:border-emerald-500 focus:ring-emerald-500/20'
    : 'focus:border-indigo-500 focus:ring-indigo-500/20';

  return (
    <div className="package-feature-editor space-y-3">
      <div className="package-feature-list flex flex-wrap gap-2 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 min-h-[50px] transition-all duration-200">
        {features.length === 0 && <span className="text-xs text-slate-500 py-1 pl-1">Chưa có tính năng nào. Hãy nhập ở dưới để thêm...</span>}
        {features.map((f, i) => (
          <span key={i} className={`package-feature-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition-all duration-150
            ${theme === 'emerald'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'}`}>
            <Sparkles size={11} className={theme === 'emerald' ? 'text-emerald-400' : 'text-indigo-400'} />
            {f}
            <button type="button" onClick={() => remove(i)} className="ml-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="package-feature-add flex gap-2">
        <input
          className={`flex-1 px-4 py-2.5 text-sm rounded-xl bg-slate-950/60 border border-slate-800/80 placeholder-slate-500 focus:outline-none focus:ring-4 transition-all duration-200 ${focusRingCls}`}
          style={{ backgroundColor: '#09090b' }}
          placeholder="Nhập tính năng rồi nhấn Enter..."
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button
          type="button"
          className={`flex items-center gap-1.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-md
            ${theme === 'emerald'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20 hover:shadow-emerald-500/30'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/20 hover:shadow-indigo-500/30'}`}
          onClick={add}
        >
          <Plus size={14} /> Thêm
        </button>
      </div>
    </div>
  );
};

// =================================================================
// Add Plan Modal — STEPPED WIZARD LAYOUT
// =================================================================
const AddPlanModal: React.FC<{
  draft: {
    code: string;
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
    includedUsers: number;
    includedDevices: number;
    maxAgents: number;
    features: string[];
    isActive: boolean;
    displayOrder: number;
  };
  onChange: (draft: any) => void;
  onClose: () => void;
  onSave: () => void;
  step: AddStep;
  setStep: (s: AddStep) => void;
  errors: Record<string, string>;
  saving: boolean;
  yearlyTotal: number;
  mode?: 'create' | 'edit';
}> = ({ draft, onChange, onClose, onSave, step, setStep, errors, saving, yearlyTotal, mode = 'create' }) => {
  const [stepError, setStepError] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const progressPercent = step === 'info' ? 33 : step === 'pricing' ? 66 : 100;
  const isEditMode = mode === 'edit';

  const modal = (
    <div className="package-modal-overlay fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-md p-4" style={{ zIndex: 1000 }}>
      <div className="package-modal-card border border-slate-800/90 rounded-2xl shadow-[0_0_50px_-12px_rgba(16,185,129,0.25)] w-[580px] max-w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ backgroundColor: '#16181d' }}>
        
        {/* Header with Title & Step Progress */}
        <div className="package-modal-header px-6 pt-5 pb-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="package-modal-title-row flex justify-between items-center mb-3">
            <div className="package-modal-title flex items-center gap-2.5">
              <div className="package-modal-icon w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                {isEditMode ? <Edit size={16} className="text-white" /> : <Plus size={16} className="text-white" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {isEditMode ? 'Chỉnh sửa gói dịch vụ' : 'Tạo gói dịch vụ mới'}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {isEditMode ? 'Cập nhật thông tin, giá và tính năng của gói hiện có' : 'Thiết lập tham số đóng gói từng bước'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="package-modal-close text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer">
              <X size={16}/>
            </button>
          </div>
          
          {/* Visual Step Progress Bar */}
          <div className="package-stepper space-y-1.5">
            <div className="package-step-labels flex justify-between text-[10px] font-bold text-slate-500">
              <span className={step === 'info' ? 'text-emerald-400 font-extrabold' : ''}>1. Thông tin chung</span>
              <span className={step === 'pricing' ? 'text-emerald-400 font-extrabold' : ''}>2. Giá & Giới hạn</span>
              <span className={step === 'features' ? 'text-emerald-400 font-extrabold' : ''}>3. Tính năng & Hoàn tất</span>
            </div>
            <div className="package-step-track h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="package-step-fill h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-350 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Step-specific Form body */}
        <div className="package-modal-body p-6 flex-1 overflow-y-auto max-h-[60vh] space-y-5">
          {stepError && (
            <div className="business-inline-alert danger">
              <span><AlertCircle size={16} /></span>
              <strong>{stepError}</strong>
              <button type="button" onClick={() => setStepError('')}><X size={14} /></button>
            </div>
          )}

          {step === 'info' && (
            <div className="space-y-4">
              <Field label="Tên gói dịch vụ" required error={errors.name}>
                <IconInput 
                  icon={<Tag size={14} />} 
                  error={errors.name} 
                  value={draft.name} 
                  onChange={(e: any) => onChange({...draft, name: e.target.value})} 
                  placeholder="VD: Enterprise Plan" 
                  theme="emerald" 
                />
              </Field>
              <Field label="Mã định danh gói (Unique Code)" required error={errors.code}>
                <IconInput 
                  icon={<Shield size={14} />} 
                  error={errors.code} 
                  value={draft.code} 
                  onChange={(e: any) => onChange({...draft, code: e.target.value.toUpperCase()})} 
                  placeholder="VD: ENTERPRISE" 
                  theme="emerald" 
                />
              </Field>
              <Field label="Thứ tự sắp xếp hiển thị">
                <IconInput 
                  type="number" 
                  icon={<Layers size={14} />} 
                  value={draft.displayOrder} 
                  onChange={(e: any) => onChange({...draft, displayOrder: Number(e.target.value)})} 
                  theme="emerald" 
                />
              </Field>
              <Field label="Mô tả bán hàng (Sales Hook)">
                <IconTextarea 
                  rows={3} 
                  icon={<Info size={14} />} 
                  value={draft.description} 
                  onChange={(e: any) => onChange({...draft, description: e.target.value})} 
                  placeholder="Mô tả ngắn gọn về giá trị gói..." 
                  theme="emerald" 
                />
              </Field>
            </div>
          )}

          {step === 'pricing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Giá mỗi tháng / user" error={errors.monthlyPrice}>
                  <IconInput 
                    type="number" 
                    icon={<DollarSign size={14} />} 
                    error={errors.monthlyPrice} 
                    value={draft.monthlyPrice} 
                    onChange={(e: any) => onChange({...draft, monthlyPrice: Number(e.target.value)})} 
                    theme="emerald" 
                  />
                </Field>
                <Field label="Giá mỗi năm / user" error={errors.yearlyPrice}>
                  <IconInput 
                    type="number" 
                    icon={<Calendar size={14} />} 
                    error={errors.yearlyPrice} 
                    value={draft.yearlyPrice} 
                    onChange={(e: any) => onChange({...draft, yearlyPrice: Number(e.target.value)})} 
                    theme="emerald" 
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Loại tiền tệ">
                  <IconSelect 
                    icon={<Globe size={14} />} 
                    value={draft.currency} 
                    onChange={(e: any) => onChange({...draft, currency: e.target.value})} 
                    theme="emerald"
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </IconSelect>
                </Field>
                <Field label="Số AI Agents tối đa">
                  <IconInput 
                    type="number" 
                    icon={<Activity size={14} />} 
                    value={draft.maxAgents} 
                    onChange={(e: any) => onChange({...draft, maxAgents: Number(e.target.value)})} 
                    theme="emerald" 
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Số lượng Users tối thiểu" required error={errors.includedUsers}>
                  <IconInput 
                    type="number" 
                    icon={<Users size={14} />} 
                    error={errors.includedUsers} 
                    value={draft.includedUsers} 
                    onChange={(e: any) => onChange({...draft, includedUsers: Number(e.target.value)})} 
                    theme="emerald" 
                  />
                </Field>
                <Field label="Số lượng Devices tối thiểu" required error={errors.includedDevices}>
                  <IconInput 
                    type="number" 
                    icon={<Monitor size={14} />} 
                    error={errors.includedDevices} 
                    value={draft.includedDevices} 
                    onChange={(e: any) => onChange({...draft, includedDevices: Number(e.target.value)})} 
                    theme="emerald" 
                  />
                </Field>
              </div>

              <label className="package-active-toggle flex items-center gap-3 mt-1.5 px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/80 cursor-pointer hover:bg-slate-800/30 transition-all duration-200">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-800 text-emerald-600 focus:ring-emerald-500/20 focus:ring-offset-slate-900 bg-slate-950/80 cursor-pointer" 
                  checked={draft.isActive} 
                  onChange={(e: any) => onChange({...draft, isActive: e.target.checked})} 
                />
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">Kích hoạt gói dịch vụ này ngay</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Khách hàng sẽ nhìn thấy và có thể chọn mua gói</span>
                </div>
              </label>
            </div>
          )}

          {step === 'features' && (
            <div className="space-y-4">
              <Field label="Tính năng nổi bật đi kèm">
                <p className="text-[10.5px] text-slate-400 mb-2">Các tính năng chính cốt lõi nhất sẽ hiển thị trên card để khách hàng so sánh trực quan.</p>
                <FeatureTags
                  features={draft.features}
                  onChange={(features) => onChange({ ...draft, features })}
                  theme="emerald"
                />
              </Field>

              {/* Package Creation Summary Box */}
              <div className="package-summary-box p-4 rounded-xl border border-slate-850 bg-slate-950/50 space-y-2.5">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Award size={13} className="text-emerald-400" /> Tóm tắt cấu hình gói
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-slate-900/60 pb-1">
                    <span className="text-slate-500">Tên gói:</span>
                    <span className="text-slate-300 font-bold">{draft.name || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900/60 pb-1">
                    <span className="text-slate-500">Mã gói:</span>
                    <span className="text-emerald-400 font-bold font-mono">{draft.code || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900/60 pb-1 col-span-2">
                    <span className="text-slate-500">Đơn giá tháng / năm:</span>
                    <span className="text-white font-bold">{formatVnd(draft.monthlyPrice)} / {formatVnd(draft.yearlyPrice)} (mỗi user)</span>
                  </div>
                  <div className="flex justify-between pt-0.5 col-span-2 text-slate-400">
                    <span>Ước tính doanh thu (Gói năm / {draft.includedUsers} Users):</span>
                    <strong className="text-emerald-400">{formatVnd(yearlyTotal)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Wizard Navigation Footer */}
        <div className="package-modal-footer flex justify-between items-center px-6 py-4 border-t border-slate-800/80 bg-slate-950/40">
          <div>
            {step !== 'info' ? (
              <button 
                type="button"
                onClick={() => setStep(step === 'features' ? 'pricing' : 'info')}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-transparent border border-slate-800 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} /> Quay lại
              </button>
            ) : (
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-transparent border border-slate-800 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                Hủy
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {step !== 'features' ? (
              <button 
                type="button"
                onClick={() => {
                  // Validate form fields của bước hiện tại trước khi next
                  if (step === 'info') {
                    if (!draft.name?.trim() || !draft.code?.trim()) {
                      alert('Vui lòng điền đầy đủ Tên gói và Mã gói dịch vụ!');
                      return;
                    }
                  }
                  setStep(step === 'info' ? 'pricing' : 'features');
                }}
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-200 cursor-pointer"
              >
                Tiếp theo <ChevronRight size={14} />
              </button>
            ) : (
              <button 
                type="button"
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} /> {saving ? (isEditMode ? 'Đang lưu...' : 'Đang tạo...') : (isEditMode ? 'Lưu thay đổi' : 'Lưu gói dịch vụ')}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

// =================================================================
// Utilities
// =================================================================
function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function isRecommendedPlan(plan: ProductPlanResponse) {
  const text = `${plan.code} ${plan.name}`.toLowerCase();
  return text.includes('pro') || text.includes('professional') || text.includes('enterprise');
}

function renderFeature(value: boolean | string) {
  if (value === true) return <span className="feature-yes"><Check size={13} /> Có</span>;
  if (value === false) return <span className="feature-no">-</span>;
  return <span className="feature-partial">{value}</span>;
}

const DeleteConfirmModal: React.FC<{
  name: string;
  onClose: () => void;
  onConfirm: () => void;
  saving?: boolean;
}> = ({ name, onClose, onConfirm, saving }) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const modal = (
    <div className="package-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="delete-confirm-card animate-in fade-in zoom-in-95 duration-200">
        <div className="delete-confirm-icon-wrap">
          <Trash2 size={24} />
        </div>
        <h3 className="delete-confirm-title">
          Xác nhận xóa gói dịch vụ
        </h3>
        <p className="delete-confirm-text">
          Bạn có chắc chắn muốn xóa gói dịch vụ <strong>"{name}"</strong> không? Hành động này sẽ gỡ bỏ gói hoàn toàn khỏi danh mục và không thể hoàn tác.
        </p>
        <div className="delete-confirm-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-cancel-confirm"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="btn-danger-confirm"
          >
            {saving ? 'Đang xóa...' : 'Đồng ý xóa'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default BusinessPackaging;
