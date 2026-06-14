import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle, BadgeCheck, Building2, CalendarClock, CheckCircle2, ClipboardCheck, ClipboardList,
  Clock, Copy, DollarSign, Download, FileSignature, FileText, Headphones, KeyRound, Lock, PackageCheck, Plus,
  ReceiptText, RefreshCw, Rocket, Search, Settings, TicketCheck, Unlock, Upload, Users, XCircle
} from 'lucide-react';
import { platformApi } from '../api/platform';
import type { BusinessDashboardResponse, OrderResponse, LicenseResponse, TenantResponse, InvoiceResponse, TicketResponse } from '../api/platform';

type BusinessView = 'dashboard' | 'orders' | 'licenses' | 'customers' | 'invoices' | 'onboarding' | 'company' | 'quotations' | 'support';

interface BusinessViewConfig {
  key: BusinessView;
  path: string;
  title: string;
  subtitle: string;
}

const businessViews: BusinessViewConfig[] = [
  { key: 'dashboard', path: '/app/business/operations', title: 'Dashboard', subtitle: 'Tổng quan hệ thống' },
  { key: 'customers', path: '/app/business/customers', title: 'Tenant CRM', subtitle: 'Quản lý công ty khách hàng, người liên hệ, trạng thái.' },
  { key: 'orders', path: '/app/business/orders', title: 'Quản lý đơn hàng', subtitle: 'Theo dõi đơn, biên lai, trạng thái thanh toán và cấp license sau khi xác nhận.' },
  { key: 'licenses', path: '/app/business/licenses', title: 'Quản lý License', subtitle: 'Kiểm soát license key, tenant, gói dịch vụ, hạn dùng, số user và thiết bị.' },
  { key: 'invoices', path: '/app/business/invoices', title: 'Hóa đơn & thanh toán', subtitle: 'Danh sách invoice, báo giá, biên lai.' },
  { key: 'support', path: '/app/business/support', title: 'Support / Ticket', subtitle: 'Tiếp nhận lỗi, yêu cầu hỗ trợ triển khai.' },
  { key: 'onboarding', path: '/app/business/onboarding', title: 'Trial / Onboarding', subtitle: 'Tạo tenant demo, enrollment token.' },
  { key: 'company', path: '/app/business/company', title: 'Cấu hình công ty', subtitle: 'Thiết lập tenant, domain, logo, tài khoản ngân hàng.' },
  { key: 'quotations', path: '/app/business/quotations', title: 'Hợp đồng / báo giá', subtitle: 'Tạo quotation, chọn gói, điều khoản.' }
];

function businessViewIcon(key: string) {
  if (key === 'dashboard') return <ClipboardList size={16} />;
  if (key === 'orders') return <ClipboardList size={16} />;
  if (key === 'licenses') return <KeyRound size={16} />;
  if (key === 'customers') return <Users size={16} />;
  if (key === 'invoices') return <ReceiptText size={16} />;
  if (key === 'onboarding') return <Rocket size={16} />;
  if (key === 'company') return <Settings size={16} />;
  if (key === 'quotations') return <FileSignature size={16} />;
  if (key === 'support') return <Headphones size={16} />;
  return <ClipboardList size={16} />;
}

function getActiveView(pathname: string): BusinessView {
  if (pathname.includes('/customers')) return 'customers';
  if (pathname.includes('/orders')) return 'orders';
  if (pathname.includes('/licenses')) return 'licenses';
  if (pathname.includes('/invoices')) return 'invoices';
  if (pathname.includes('/onboarding')) return 'onboarding';
  if (pathname.includes('/company')) return 'company';
  if (pathname.includes('/quotations')) return 'quotations';
  if (pathname.includes('/support')) return 'support';
  return 'dashboard';
}

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function statusPill(status: string) {
  if (status === 'Pending') return <span className="status-pill status-amber">Chờ duyệt</span>;
  if (status === 'Approved') return <span className="status-pill status-blue">Đã duyệt</span>;
  if (status === 'Completed' || status === 'Paid') return <span className="status-pill status-green">Hoàn thành</span>;
  if (status === 'Cancelled') return <span className="status-pill status-red">Đã hủy</span>;
  return <span className="status-pill">{status}</span>;
}

function licenseStatusPill(status: string) {
  if (status === 'Active') return <span className="status-pill status-green">Đang chạy</span>;
  if (status === 'Suspended' || status === 'Locked') return <span className="status-pill status-red">Đã khóa</span>;
  if (status === 'Expired') return <span className="status-pill status-amber">Hết hạn</span>;
  return <span className="status-pill">{status}</span>;
}

function customerStatusPill(status: string) {
  if (status === 'Trial') return <span className="status-pill status-blue">Dùng thử</span>;
  if (status === 'Active' || status === 'Paid') return <span className="status-pill status-green">Đã trả phí</span>;
  if (status === 'Expired') return <span className="status-pill status-amber">Hết hạn</span>;
  if (status === 'Suspended') return <span className="status-pill status-red">Bị khóa</span>;
  return <span className="status-pill">{status}</span>;
}

function priorityPill(priority: string) {
  const p = priority?.toLowerCase() || 'low';
  if (p === 'low') return <span className="status-pill status-blue">Thấp</span>;
  if (p === 'medium' || p === 'normal') return <span className="status-pill status-amber">Trung bình</span>;
  if (p === 'high') return <span className="status-pill status-red">Cao</span>;
  if (p === 'urgent') return <span className="status-pill status-red">Khẩn cấp</span>;
  return <span className="status-pill">{priority}</span>;
}

function ticketStatusPill(status: string) {
  if (status === 'Open') return <span className="status-pill status-amber">Mới</span>;
  if (status === 'In Progress' || status === 'In-progress') return <span className="status-pill status-blue">Đang xử lý</span>;
  if (status === 'Resolved' || status === 'Closed') return <span className="status-pill status-green">Đã đóng</span>;
  return <span className="status-pill">{status}</span>;
}

export const BusinessOperations: React.FC = () => {
  const location = useLocation();
  const activeView = getActiveView(location.pathname);
  const view = businessViews.find(item => item.key === activeView) ?? businessViews[0];

  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<BusinessDashboardResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [licenses, setLicenses] = useState<LicenseResponse[]>([]);
  const [customers, setCustomers] = useState<TenantResponse[]>([]);
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [copiedValue, setCopiedValue] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeView === 'dashboard') {
        const res = await platformApi.getDashboard();
        setDashboard(res);
      } else if (activeView === 'customers') {
        const res = await platformApi.getTenants({ page: 1, pageSize: 100 });
        setCustomers(res.items);
      } else if (activeView === 'orders') {
        const res = await platformApi.getOrders({ page: 1, pageSize: 100 });
        setOrders(res.items);
      } else if (activeView === 'licenses') {
        const res = await platformApi.getLicenses();
        setLicenses(res);
      } else if (activeView === 'invoices') {
        const res = await platformApi.getInvoices({ page: 1, pageSize: 100 });
        setInvoices(res.items);
      } else if (activeView === 'support') {
        const res = await platformApi.getTickets({ page: 1, pageSize: 100 });
        setTickets(res.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeView]);

  const copyText = (value: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopiedValue(value);
      window.setTimeout(() => setCopiedValue(''), 1300);
    });
  };

  return (
    <div className="bizops-page">
      <div className="page-header bizops-header">
        <div>
          <h1>{view.title}</h1>
          <p className="subtitle">{view.subtitle}</p>
        </div>
        <div className="bizops-header-actions">
          <Link className="btn-secondary" to="/app/business/payment">Xác nhận thanh toán</Link>
          <Link className="btn-primary" to="/app/business/packages"><PackageCheck size={15} /> Gói bán</Link>
        </div>
      </div>

      <nav className="bizops-tabs card glass">
        {businessViews.map(item => (
          <Link key={item.key} to={item.path} className={activeView === item.key ? 'active' : ''}>
            {businessViewIcon(item.key)}
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>

      {loading && <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>}

      {!loading && activeView === 'dashboard' && dashboard && (
        <section className="bizops-metrics">
          <MetricCard icon={<Building2 />} label="Tổng khách hàng" value={String(dashboard.totalTenants)} tone="blue" />
          <MetricCard icon={<Users />} label="Đang Trial" value={String(dashboard.trialTenants)} tone="amber" />
          <MetricCard icon={<BadgeCheck />} label="Đã trả phí" value={String(dashboard.paidTenants)} tone="purple" />
          <MetricCard icon={<KeyRound />} label="License Active" value={String(dashboard.activeSubscriptions)} tone="green" />
          <MetricCard icon={<ClipboardList />} label="Đơn hàng chờ duyệt" value={String(dashboard.pendingOrders)} tone="blue" />
          <MetricCard icon={<ReceiptText />} label="Thanh toán chờ xử lý" value={String(dashboard.pendingPayments)} tone="amber" />
          <MetricCard icon={<Headphones />} label="Ticket đang mở" value={String(dashboard.openTickets)} tone="red" />
          <MetricCard icon={<DollarSign size={18} />} label="Doanh thu ghi nhận" value={formatVnd(dashboard.recognizedRevenue)} tone="green" />
        </section>
      )}

      {!loading && activeView === 'orders' && (
        <OrdersView orders={orders} onReload={loadData} />
      )}

      {!loading && activeView === 'licenses' && (
        <LicensesView licenses={licenses} copiedValue={copiedValue} onCopy={copyText} onReload={loadData} />
      )}

      {!loading && activeView === 'customers' && (
        <CustomersView customers={customers} onReload={loadData} />
      )}

      {!loading && activeView === 'invoices' && (
        <InvoicesView invoices={invoices} onReload={loadData} />
      )}

      {!loading && activeView === 'support' && (
        <SupportView tickets={tickets} onReload={loadData} />
      )}

      {!loading && activeView === 'onboarding' && (
        <div className="p-8 text-center text-gray-500">Vui lòng chọn công ty khách hàng ở tab Tenant CRM để xem Onboarding Checklist.</div>
      )}

      {!loading && activeView === 'company' && (
        <div className="p-8 text-center text-gray-500">Chức năng cấu hình Company Settings hiện đang bảo trì.</div>
      )}

      {!loading && activeView === 'quotations' && (
        <div className="p-8 text-center text-gray-500">Chức năng Quotations (Báo giá) đang được nâng cấp.</div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: string }> = ({ icon, label, value, tone }) => (
  <div className={`bizops-metric card glass ${tone}`}>
    <span>{icon}</span>
    <div>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  </div>
);

const OrdersView: React.FC<{ orders: OrderResponse[], onReload: () => void }> = ({ orders, onReload }) => {
  const handleProvision = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn duyệt và cấp License cho đơn hàng này?')) return;
    try {
      await platformApi.provisionOrder(id);
      alert('Đã cấp phát license thành công!');
      onReload();
    } catch (e: any) {
      alert('Lỗi khi duyệt đơn: ' + e?.message || e);
    }
  };
  const handleCancel = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    try {
      await platformApi.cancelOrder(id);
      onReload();
    } catch (e: any) {
      alert('Lỗi khi hủy đơn: ' + e?.message || e);
    }
  };
  return (
    <div className="bizops-split">
      <section className="card glass bizops-panel" style={{ flex: 1 }}>
        <div className="bizops-panel-title">
          <div><ClipboardList size={18} /><h2>Danh sách đơn hàng</h2></div>
        </div>
        <div className="bizops-table-wrap">
          <table className="bizops-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Gói</th>
                <th>User / Device</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td><strong>{order.orderNumber}</strong><br/><small>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</small></td>
                  <td>{order.companyName}<br/><small>{order.tenantCode}</small></td>
                  <td>{order.planName} ({order.billingCycle})</td>
                  <td>{order.userQuantity} / {order.deviceQuantity}</td>
                  <td>{formatVnd(order.totalAmount)}</td>
                  <td>{statusPill(order.status)}</td>
                  <td>
                    <div className="bizops-actions">
                      {(order.status === 'Pending' || order.status === 'Paid') && (
                        <button onClick={() => handleProvision(order.id)}>Duyệt & Cấp License</button>
                      )}
                      {order.status !== 'Cancelled' && order.status !== 'Completed' && (
                        <button className="danger" onClick={() => handleCancel(order.id)}>Hủy</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={7} className="text-center p-4">Không có đơn hàng nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const LicensesView: React.FC<{ licenses: LicenseResponse[], copiedValue: string, onCopy: (v: string) => void, onReload: () => void }> = ({ licenses, copiedValue, onCopy, onReload }) => {
  const toggleLock = async (id: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
      await platformApi.updateLicenseStatus(id, nextStatus);
      onReload();
    } catch (e: any) {
      alert('Lỗi: ' + e?.message || e);
    }
  };
  const handleRenew = async (id: string) => {
    if (!confirm('Gia hạn license này thêm 12 tháng?')) return;
    try {
      await platformApi.renewLicense(id, { months: 12 });
      alert('Gia hạn thành công!');
      onReload();
    } catch (e: any) {
      alert('Lỗi: ' + e?.message || e);
    }
  };
  return (
    <section className="card glass bizops-panel">
      <div className="bizops-panel-title">
        <div><KeyRound size={18} /><h2>Quản lý License</h2></div>
      </div>
      <div className="bizops-table-wrap">
        <table className="bizops-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Gói</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày hết hạn</th>
              <th>User / Device</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map(l => (
              <tr key={l.id}>
                <td><strong>{l.tenantCode}</strong></td>
                <td>{l.planName}</td>
                <td>{new Date(l.startsAt).toLocaleDateString('vi-VN')}</td>
                <td>{new Date(l.expiresAt).toLocaleDateString('vi-VN')}</td>
                <td>{l.usedUsers}/{l.userLimit} user<br/>{l.usedDevices}/{l.deviceLimit} thiết bị</td>
                <td>{licenseStatusPill(l.status)}</td>
                <td>
                  <div className="bizops-actions">
                    <button onClick={() => toggleLock(l.id, l.status)}>{l.status === 'Active' ? 'Khóa' : 'Mở khóa'}</button>
                    <button onClick={() => handleRenew(l.id)}>Gia hạn</button>
                  </div>
                </td>
              </tr>
            ))}
            {licenses.length === 0 && <tr><td colSpan={7} className="text-center p-4">Không có license nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const CustomersView: React.FC<{ customers: TenantResponse[], onReload: () => void }> = ({ customers, onReload }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const handleStatusChange = async (id: string, current: string) => {
    const next = current === 'Active' ? 'Suspended' : 'Active';
    try {
      await platformApi.updateTenantStatus(id, next);
      onReload();
    } catch (e: any) {
      alert('Lỗi: ' + e?.message || e);
    }
  };

  const handleAddTrial = async () => {
    if (!newCompany || !newEmail || !newName || !newDomain) return alert('Vui lòng điền đủ thông tin');
    try {
      await platformApi.createTrialTenant({
        code: newDomain.split('.')[0].toLowerCase(),
        companyName: newCompany,
        emailDomain: newDomain,
        ownerName: newName,
        ownerEmail: newEmail,
        ownerPassword: 'TrialPassword@123'
      });
      alert('Tạo khách hàng Trial thành công!');
      setShowAdd(false);
      onReload();
    } catch (e: any) {
      alert('Lỗi tạo Trial: ' + e?.message || e);
    }
  };

  return (
    <div className="bizops-split">
      <section className="card glass bizops-panel" style={{ flex: 1 }}>
        <div className="bizops-panel-title">
          <div><Building2 size={18} /><h2>Khách hàng / Tenant CRM</h2></div>
          <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}><Plus size={14} /> Thêm Trial</button>
        </div>

        {showAdd && (
          <div className="p-4 mb-4" style={{ background: 'var(--glass-surface)', borderRadius: '8px' }}>
            <h3 className="mb-2 font-bold">Thêm Khách hàng dùng thử (Trial)</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="text" placeholder="Tên công ty (VD: Sao Việt Tech)" value={newCompany} onChange={e => setNewCompany(e.target.value)} className="w-full p-2 rounded bg-black/20 border border-white/10 text-white" />
              <input type="text" placeholder="Domain (VD: saoviet.vn)" value={newDomain} onChange={e => setNewDomain(e.target.value)} className="w-full p-2 rounded bg-black/20 border border-white/10 text-white" />
              <input type="text" placeholder="Tên Admin (VD: Nguyễn Văn A)" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-2 rounded bg-black/20 border border-white/10 text-white" />
              <input type="email" placeholder="Email Admin (VD: admin@saoviet.vn)" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full p-2 rounded bg-black/20 border border-white/10 text-white" />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={handleAddTrial}>Tạo Trial</button>
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>Hủy</button>
            </div>
          </div>
        )}

        <div className="bizops-crm-grid">
          {customers.map(c => (
            <div className="bizops-crm-card" key={c.id}>
              <div className="crm-head">
                <div>
                  <strong>{c.companyName} ({c.code})</strong>
                  <span>{c.ownerName}</span>
                </div>
                {customerStatusPill(c.status || 'Active')}
              </div>
              <p>{c.ownerEmail}</p>
              <p>{c.ownerPhone}</p>
              <div className="crm-plan">{c.currentPlan || 'Không có gói'}</div>
              <small>Users: {c.activeUsers} | Devices: {c.activeDevices}</small>
              <div className="mt-4">
                <button className="btn-secondary w-full" onClick={() => handleStatusChange(c.id, c.status || 'Active')}>
                  {c.status === 'Active' ? 'Khóa Tenant' : 'Mở khóa Tenant'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const InvoicesView: React.FC<{ invoices: InvoiceResponse[], onReload: () => void }> = ({ invoices, onReload }) => {
  const markAsPaid = async (id: string) => {
    try {
      await platformApi.updateInvoiceStatus(id, 'Paid');
      onReload();
    } catch (e: any) {
      alert('Lỗi: ' + e?.message || e);
    }
  };
  return (
    <section className="card glass bizops-panel">
      <div className="bizops-panel-title">
        <div><ReceiptText size={18} /><h2>Danh sách Hóa đơn</h2></div>
      </div>
      <div className="bizops-table-wrap">
        <table className="bizops-table">
          <thead>
            <tr>
              <th>Mã hóa đơn</th>
              <th>Khách hàng</th>
              <th>Số tiền</th>
              <th>Ngày lập</th>
              <th>Hạn chót</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td><strong>{inv.invoiceNumber}</strong></td>
                <td>{inv.companyName}</td>
                <td>{formatVnd(inv.totalAmount)}</td>
                <td>{new Date(inv.issuedAt).toLocaleDateString('vi-VN')}</td>
                <td>{new Date(inv.dueAt).toLocaleDateString('vi-VN')}</td>
                <td>{statusPill(inv.status)}</td>
                <td>
                  <div className="bizops-actions">
                    {inv.status !== 'Paid' && <button onClick={() => markAsPaid(inv.id)}>Đánh dấu Đã thanh toán</button>}
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && <tr><td colSpan={7} className="text-center p-4">Không có hóa đơn nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const SupportView: React.FC<{ tickets: TicketResponse[], onReload: () => void }> = ({ tickets, onReload }) => {
  const updateStatus = async (id: string, status: string) => {
    try {
      await platformApi.updateTicket(id, { status });
      onReload();
    } catch (e: any) {
      alert('Lỗi: ' + e?.message || e);
    }
  };
  return (
    <section className="card glass bizops-panel">
      <div className="bizops-panel-title">
        <div><Headphones size={18} /><h2>Support Tickets</h2></div>
      </div>
      <div className="bizops-table-wrap">
        <table className="bizops-table">
          <thead>
            <tr>
              <th>Mã Ticket</th>
              <th>Tiêu đề</th>
              <th>Độ ưu tiên</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id}>
                <td><strong>{t.ticketNumber}</strong></td>
                <td>{t.subject}</td>
                <td>{priorityPill(t.priority)}</td>
                <td>{ticketStatusPill(t.status)}</td>
                <td>{new Date(t.createdAt).toLocaleDateString('vi-VN')}</td>
                <td>
                  <div className="bizops-actions">
                    {t.status === 'Open' && <button onClick={() => updateStatus(t.id, 'In Progress')}>Xử lý</button>}
                    {t.status !== 'Resolved' && <button onClick={() => updateStatus(t.id, 'Resolved')}>Đóng</button>}
                  </div>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && <tr><td colSpan={6} className="text-center p-4">Không có ticket nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default BusinessOperations;
