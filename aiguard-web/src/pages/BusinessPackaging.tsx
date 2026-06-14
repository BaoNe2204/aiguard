import React, { useMemo, useState, useEffect } from 'react';
import {
  Check, DollarSign, Layers, PackageCheck, Edit, Plus, Save, X
} from 'lucide-react';
import { platformApi } from '../api/platform';
import type { ProductPlanResponse } from '../api/platform';

type DeploymentModel = 'saas' | 'private-cloud' | 'on-premise';

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
  const [plans, setPlans] = useState<ProductPlanResponse[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [users, setUsers] = useState(120);
  const [deployment, setDeployment] = useState<DeploymentModel>('saas');
  const agentAddon = true;
  const agentCount = 8;

  const [loading, setLoading] = useState(false);
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
      const res = await platformApi.getPlans();
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
  }, []);

  const handleSaveEdit = async () => {
    if (!editingPlan) return;
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
  
  const quote = useMemo(() => {
    if (!plan) return { base: 0, addon: 0, monthly: 0, annual: 0 };
    const base = plan.monthlyPrice * users;
    const addon = agentAddon ? agentCount * 250000 : 0;
    const multiplier = deployment === 'saas' ? 1 : deployment === 'private-cloud' ? 1.35 : 1.75;
    const monthly = Math.round((base + addon) * multiplier);
    const annual = monthly * 12;
    return { base, addon, monthly, annual };
  }, [agentAddon, agentCount, deployment, plan, users]);

  return (
    <div className="business-page">
      <div className="page-header business-page-header">
        <div>
          <h1>Đóng gói & Bảng giá</h1>
          <p className="subtitle">Quản lý các gói dịch vụ (Trial, Starter, Professional, Enterprise) và bộ tính giá.</p>
        </div>
        <div className="business-header-actions">
          <button className="btn-primary" onClick={() => setShowAddForm(true)}><Plus size={15} /> Tạo gói mới</button>
        </div>
      </div>

      {showAddForm && (
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
        <section className="business-section">
          <div className="section-title">
            <PackageCheck size={18} />
            <h2>Cấu hình các gói dịch vụ (Plans)</h2>
          </div>
          <div className="business-plan-grid">
            {plans.map(item => (
              <div key={item.id} className={`business-plan-card card glass ${selectedPlanId === item.id ? 'active' : ''} relative`}>
                <button 
                  onClick={() => setEditingPlan(item)} 
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  title="Sửa cấu hình gói"
                >
                  <Edit size={14} />
                </button>

                <div className="cursor-pointer" onClick={() => setSelectedPlanId(item.id)}>
                  <div className="plan-badge-row">
                    <span className="plan-badge">{item.code}</span>
                    {!item.isActive && <span className="plan-badge !bg-red-500/20 !text-red-300 border-red-500/30">Đã tắt</span>}
                  </div>
                  <div className="plan-head">
                    <span>{item.name}</span>
                    <b>{item.monthlyPrice > 0 ? `${formatVnd(item.monthlyPrice)}/user/tháng` : 'Miễn phí'}</b>
                  </div>
                  <p>{item.description || 'Chưa có mô tả'}</p>
                  <small>Tối đa: {item.includedUsers} users · {item.includedDevices} devices</small>
                  <ul>
                    {item.features?.slice(0, 5).map(feature => <li key={feature}><Check size={13} /> {feature}</li>)}
                  </ul>
                </div>
              </div>
            ))}
            {plans.length === 0 && <div className="text-gray-400 p-4">Chưa có gói dịch vụ nào. Hãy tạo mới.</div>}
          </div>
        </section>
      )}

      {editingPlan && (
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

      {plan && (
        <section className="business-grid">
          <div className="card glass business-calculator">
            <div className="section-title">
              <DollarSign size={18} />
              <h2>Bộ tính báo giá: {plan.name}</h2>
            </div>
            <label>Số người dùng<input type="number" min={1} value={users} onChange={e => setUsers(Number(e.target.value))} /></label>
            <label>
              Mô hình triển khai
              <select value={deployment} onChange={e => setDeployment(e.target.value as DeploymentModel)}>
                <option value="saas">Cloud SaaS</option>
                <option value="private-cloud">Private Cloud (+35%)</option>
                <option value="on-premise">On-premise (+75%)</option>
              </select>
            </label>
            <div className="quote-box">
              <div><span>Ước tính mỗi tháng</span><strong>{formatVnd(quote.monthly)}</strong></div>
              <div><span>Ước tính mỗi năm</span><strong>{formatVnd(quote.annual)}</strong></div>
            </div>
          </div>
        </section>
      )}

      <section className="business-section card glass">
        <div className="section-title">
          <Layers size={18} />
          <h2>Bảng so sánh tính năng (Tài liệu Sales)</h2>
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

function renderFeature(value: boolean | string) {
  if (value === true) return <span className="feature-yes">Có</span>;
  if (value === false) return <span className="feature-no">Chưa gồm</span>;
  return <span className="feature-partial">{value}</span>;
}

export default BusinessPackaging;
