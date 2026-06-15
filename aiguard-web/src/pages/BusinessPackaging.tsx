import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, Edit, Layers, PackageCheck, Plus, Save, X
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

export const BusinessPackaging: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === 'PlatformAdmin';
  const canBuyPlan = user?.role === 'TenantOwner';
  const [plans, setPlans] = useState<ProductPlanResponse[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');


  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ProductPlanResponse | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newPlan, setNewPlan] = useState({
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
    displayOrder: 1
  });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = isPlatformAdmin ? await platformApi.getPlans() : await businessApi.getPlans();
      const sorted = res.sort((a, b) => a.displayOrder - b.displayOrder);
      setPlans(sorted);
      if (sorted.length > 0 && !selectedPlanId) {
        setSelectedPlanId(sorted[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [isPlatformAdmin]);

  const handleSaveEdit = async () => {
    if (!editingPlan || !isPlatformAdmin) return;
    try {
      await platformApi.updatePlan(editingPlan.id, editingPlan);
      alert('Cập nhật gói thành công!');
      setEditingPlan(null);
      loadPlans();
    } catch (e: any) {
      alert('Lỗi: ' + e?.message || e);
    }
  };

  const handleCreate = async () => {
    if (!isPlatformAdmin) return;
    try {
      await platformApi.createPlan(newPlan);
      alert('Tạo gói thành công!');
      setShowAddForm(false);
      loadPlans();
    } catch (e: any) {
      alert('Lỗi: ' + e?.message || e);
    }
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
        state: {
          order,
          plan: targetPlan,
          purchaseMonths: 1
        }
      });
    } catch (e: any) {
      alert('Lỗi: ' + (e?.message || e));
    } finally {
      setBuying(false);
    }
  };



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
          <button className="btn-primary" onClick={() => setShowAddForm(true)}><Plus size={15} /> Tạo gói mới</button>
        </div>}
      </div>

      {isPlatformAdmin && showAddForm && (
        <section className="card glass business-section p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><Plus size={18}/> Thêm gói dịch vụ mới</h2>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label>Mã gói (VD: STARTER)<input className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={newPlan.code} onChange={e => setNewPlan({...newPlan, code: e.target.value})} /></label>
            <label>Tên gói (VD: Starter Plan)<input className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} /></label>
            <label>Giá mỗi user / tháng (VND)<input type="number" className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={newPlan.monthlyPrice} onChange={e => setNewPlan({...newPlan, monthlyPrice: Number(e.target.value)})} /></label>
            <label>Số users tối đa<input type="number" className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={newPlan.includedUsers} onChange={e => setNewPlan({...newPlan, includedUsers: Number(e.target.value)})} /></label>
            <label>Số thiết bị tối đa<input type="number" className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={newPlan.includedDevices} onChange={e => setNewPlan({...newPlan, includedDevices: Number(e.target.value)})} /></label>
            <label>Thứ tự hiển thị<input type="number" className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={newPlan.displayOrder} onChange={e => setNewPlan({...newPlan, displayOrder: Number(e.target.value)})} /></label>
            <label className="col-span-2">Mô tả ngắn<input className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} /></label>
          </div>
          <div className="mt-6 flex justify-end">
            <button className="btn-primary" onClick={handleCreate}><Save size={16}/> Lưu gói mới</button>
          </div>
        </section>
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
                  <button
                    onClick={() => setEditingPlan(item)}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    title="Sửa cấu hình gói"
                  >
                    <Edit size={14} />
                  </button>
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

      {isPlatformAdmin && editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e2128] border border-white/10 p-6 rounded-xl shadow-2xl w-[600px] max-w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2"><Edit size={18}/> Chỉnh sửa gói: {editingPlan.name}</h3>
              <button onClick={() => setEditingPlan(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <label>Tên gói<input className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} /></label>
              <label>Mã gói<input className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={editingPlan.code} onChange={e => setEditingPlan({...editingPlan, code: e.target.value})} /></label>
              
              <label>Giá tháng / user (VND)<input type="number" className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={editingPlan.monthlyPrice} onChange={e => setEditingPlan({...editingPlan, monthlyPrice: Number(e.target.value)})} /></label>
              <label>Giá năm / user (VND)<input type="number" className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={editingPlan.yearlyPrice} onChange={e => setEditingPlan({...editingPlan, yearlyPrice: Number(e.target.value)})} /></label>
              
              <label>Số Users cho phép<input type="number" className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={editingPlan.includedUsers} onChange={e => setEditingPlan({...editingPlan, includedUsers: Number(e.target.value)})} /></label>
              <label>Số Devices cho phép<input type="number" className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={editingPlan.includedDevices} onChange={e => setEditingPlan({...editingPlan, includedDevices: Number(e.target.value)})} /></label>
              
              <label className="col-span-2">Mô tả (Sales Hook)<input className="w-full p-2 mt-1 rounded bg-black/20 border border-white/10" value={editingPlan.description || ''} onChange={e => setEditingPlan({...editingPlan, description: e.target.value})} /></label>
              
              <label className="flex items-center gap-2 col-span-2 p-2 mt-2 bg-white/5 rounded border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                <input type="checkbox" className="w-5 h-5 accent-blue-500" checked={editingPlan.isActive} onChange={e => setEditingPlan({...editingPlan, isActive: e.target.checked})} />
                <span className="font-medium text-white">Kích hoạt gói dịch vụ này (Đang bán)</span>
              </label>
            </div>
            
            <div className="mt-8 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setEditingPlan(null)}>Hủy</button>
              <button className="btn-primary" onClick={handleSaveEdit}><Save size={16}/> Lưu thay đổi</button>
            </div>
          </div>
        </div>
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

export default BusinessPackaging;
