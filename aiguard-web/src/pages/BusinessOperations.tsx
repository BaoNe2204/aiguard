import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BadgeCheck, Building2, ClipboardList, DollarSign, FileSignature, Headphones,
  KeyRound, PackageCheck, Plus, ReceiptText, Rocket, Settings, Users
} from 'lucide-react';
import { platformApi } from '../api/platform';
import type {
  BusinessDashboardResponse,
  InvoiceResponse,
  LicenseResponse,
  OrderResponse,
  TenantResponse,
  TicketResponse
} from '../api/platform';

type BusinessView = 'dashboard' | 'orders' | 'licenses' | 'customers' | 'invoices' | 'onboarding' | 'company' | 'quotations' | 'support';

const businessViews: Record<BusinessView, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Tổng quan',
    subtitle: 'Tổng quan hệ thống SaaS và hoạt động kinh doanh.'
  },
  customers: {
    title: 'Khách hàng / Tenant CRM',
    subtitle: 'Quản lý công ty khách hàng, người liên hệ và trạng thái tenant.'
  },
  orders: {
    title: 'Quản lý đơn hàng',
    subtitle: 'Theo dõi đơn, biên lai, trạng thái thanh toán và cấp license sau khi xác nhận.'
  },
  licenses: {
    title: 'Quản lý License',
    subtitle: 'Kiểm soát license key, tenant, gói dịch vụ, hạn dùng, số user và thiết bị.'
  },
  invoices: {
    title: 'Hóa đơn & thanh toán',
    subtitle: 'Danh sách invoice, báo giá và biên lai.'
  },
  support: {
    title: 'Hỗ trợ / Ticket',
    subtitle: 'Tiếp nhận lỗi và yêu cầu hỗ trợ triển khai.'
  },
  onboarding: {
    title: 'Trial / Onboarding',
    subtitle: 'Tạo tenant demo và enrollment token.'
  },
  company: {
    title: 'Cấu hình công ty',
    subtitle: 'Thiết lập tenant, domain, logo và tài khoản ngân hàng.'
  },
  quotations: {
    title: 'Hợp đồng / báo giá',
    subtitle: 'Tạo quotation, chọn gói và điều khoản.'
  }
};

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
  if (status === 'Active') return <span className="status-pill status-green">Đang hoạt động</span>;
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
  const value = priority?.toLowerCase() || 'low';
  if (value === 'low') return <span className="status-pill status-blue">Thấp</span>;
  if (value === 'medium' || value === 'normal') return <span className="status-pill status-amber">Trung bình</span>;
  if (value === 'high') return <span className="status-pill status-red">Cao</span>;
  if (value === 'urgent') return <span className="status-pill status-red">Khẩn cấp</span>;
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
  const view = businessViews[activeView];
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<BusinessDashboardResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [licenses, setLicenses] = useState<LicenseResponse[]>([]);
  const [customers, setCustomers] = useState<TenantResponse[]>([]);
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeView === 'dashboard') {
        setDashboard(await platformApi.getDashboard());
      } else if (activeView === 'customers') {
        const res = await platformApi.getTenants({ page: 1, pageSize: 100 });
        setCustomers(res.items);
      } else if (activeView === 'orders') {
        const res = await platformApi.getOrders({ page: 1, pageSize: 100 });
        setOrders(res.items);
      } else if (activeView === 'licenses') {
        setLicenses(await platformApi.getLicenses());
      } else if (activeView === 'invoices') {
        const res = await platformApi.getInvoices({ page: 1, pageSize: 100 });
        setInvoices(res.items);
      } else if (activeView === 'support') {
        const res = await platformApi.getTickets({ page: 1, pageSize: 100 });
        setTickets(res.items);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeView]);

  return (
    <div className="bizops-page">
      <div className="page-header bizops-header">
        <div>
          <h1>{view.title}</h1>
          <p className="subtitle">{view.subtitle}</p>
        </div>
      </div>

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
        <LicensesView licenses={licenses} onReload={loadData} />
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
        <EmptyState message="Vui lòng chọn khách hàng trong mục Khách hàng / Tenant CRM ở sidebar để xem Onboarding Checklist." />
      )}
      {!loading && activeView === 'company' && <EmptyState message="Chức năng cấu hình công ty hiện đang bảo trì." />}
      {!loading && activeView === 'quotations' && <EmptyState message="Chức năng hợp đồng / báo giá đang được nâng cấp." />}
    </div>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="card glass p-8 text-center text-gray-400">{message}</div>
);

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: string }> = ({ icon, label, value, tone }) => (
  <div className={`bizops-metric card glass ${tone}`}>
    <span>{icon}</span>
    <div>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  </div>
);

const DashboardView: React.FC<{ dashboard: BusinessDashboardResponse }> = ({ dashboard }) => (
  <section className="bizops-metrics">
    <MetricCard icon={<Building2 />} label="Tổng khách hàng" value={String(dashboard.totalTenants)} tone="blue" />
    <MetricCard icon={<Users />} label="Đang Trial" value={String(dashboard.trialTenants)} tone="amber" />
    <MetricCard icon={<BadgeCheck />} label="Đã trả phí" value={String(dashboard.paidTenants)} tone="purple" />
    <MetricCard icon={<KeyRound />} label="License đang hoạt động" value={String(dashboard.activeSubscriptions)} tone="green" />
    <MetricCard icon={<ClipboardList />} label="Đơn hàng chờ duyệt" value={String(dashboard.pendingOrders)} tone="blue" />
    <MetricCard icon={<ReceiptText />} label="Thanh toán chờ xử lý" value={String(dashboard.pendingPayments)} tone="amber" />
    <MetricCard icon={<Headphones />} label="Ticket đang mở" value={String(dashboard.openTickets)} tone="red" />
    <MetricCard icon={<DollarSign size={18} />} label="Doanh thu ghi nhận" value={formatVnd(dashboard.recognizedRevenue)} tone="green" />
  </section>
);

const OrdersView: React.FC<{ orders: OrderResponse[]; onReload: () => void }> = ({ orders, onReload }) => {
  const handleProvision = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn duyệt và cấp license cho đơn hàng này?')) return;
    await platformApi.provisionOrder(id);
    await onReload();
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    await platformApi.cancelOrder(id);
    await onReload();
  };

  return (
    <section className="card glass bizops-panel">
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
                <td><strong>{order.orderNumber}</strong><br /><small>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</small></td>
                <td>{order.companyName}<br /><small>{order.tenantCode}</small></td>
                <td>{order.planName} ({order.billingCycle})</td>
                <td>{order.userQuantity} / {order.deviceQuantity}</td>
                <td>{formatVnd(order.totalAmount)}</td>
                <td>{statusPill(order.status)}</td>
                <td>
                  <div className="bizops-actions">
                    {(order.status === 'Pending' || order.status === 'Paid') && (
                      <button onClick={() => handleProvision(order.id)}>Duyệt & cấp License</button>
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
  );
};

const LicensesView: React.FC<{ licenses: LicenseResponse[], onReload: () => void }> = ({ licenses, onReload }) => {
  const toggleLock = async (id: string, currentStatus: string) => {
    await platformApi.updateLicenseStatus(id, currentStatus === 'Active' ? 'Suspended' : 'Active');
    await onReload();
  };

  const handleRenew = async (id: string) => {
    if (!confirm('Gia hạn license này thêm 12 tháng?')) return;
    await platformApi.renewLicense(id, { months: 12 });
    await onReload();
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
            {licenses.map(license => (
              <tr key={license.id}>
                <td><strong>{license.tenantCode}</strong></td>
                <td>{license.planName}</td>
                <td>{new Date(license.startsAt).toLocaleDateString('vi-VN')}</td>
                <td>{new Date(license.expiresAt).toLocaleDateString('vi-VN')}</td>
                <td>{license.usedUsers}/{license.userLimit} user<br />{license.usedDevices}/{license.deviceLimit} thiết bị</td>
                <td>{licenseStatusPill(license.status)}</td>
                <td>
                  <div className="bizops-actions">
                    <button onClick={() => toggleLock(license.id, license.status)}>{license.status === 'Active' ? 'Khóa' : 'Mở khóa'}</button>
                    <button onClick={() => handleRenew(license.id)}>Gia hạn</button>
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

const CustomersView: React.FC<{ customers: TenantResponse[]; onReload: () => void }> = ({ customers, onReload }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const handleStatusChange = async (id: string, current: string) => {
    await platformApi.updateTenantStatus(id, current === 'Active' ? 'Suspended' : 'Active');
    await onReload();
  };

  const handleAddTrial = async () => {
    if (!newCompany || !newEmail || !newName || !newDomain) {
      alert('Vui lòng điền đủ thông tin');
      return;
    }
    await platformApi.createTrialTenant({
      code: newDomain.split('.')[0].toLowerCase(),
      companyName: newCompany,
      emailDomain: newDomain,
      ownerName: newName,
      ownerEmail: newEmail,
      ownerPassword: 'TrialPassword@123'
    });
    setShowAdd(false);
    await onReload();
  };

  return (
    <section className="card glass bizops-panel">
      <div className="bizops-panel-title">
        <div><Building2 size={18} /><h2>Khách hàng / Tenant CRM</h2></div>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}><Plus size={14} /> Thêm Trial</button>
      </div>

      {showAdd && (
        <div className="bizops-inline-form">
          <h3>Thêm khách hàng dùng thử</h3>
          <div className="bizops-form-grid">
            <input type="text" placeholder="Tên công ty" value={newCompany} onChange={event => setNewCompany(event.target.value)} />
            <input type="text" placeholder="Domain công ty" value={newDomain} onChange={event => setNewDomain(event.target.value)} />
            <input type="text" placeholder="Tên admin" value={newName} onChange={event => setNewName(event.target.value)} />
            <input type="email" placeholder="Email admin" value={newEmail} onChange={event => setNewEmail(event.target.value)} />
          </div>
          <div className="bizops-actions">
            <button className="btn-primary" onClick={handleAddTrial}>Tạo Trial</button>
            <button className="btn-secondary" onClick={() => setShowAdd(false)}>Hủy</button>
          </div>
        </div>
      )}

      <div className="bizops-crm-grid">
        {customers.map(customer => (
          <div className="bizops-crm-card" key={customer.id}>
            <div className="crm-head">
              <div>
                <strong>{customer.companyName} ({customer.code})</strong>
                <span>{customer.ownerName}</span>
              </div>
              {customerStatusPill(customer.status || 'Active')}
            </div>
            <p>{customer.ownerEmail}</p>
            <p>{customer.ownerPhone}</p>
            <div className="crm-plan">{customer.currentPlan || 'Không có gói'}</div>
            <small>Users: {customer.activeUsers} | Devices: {customer.activeDevices}</small>
            <button className="btn-secondary w-full mt-4" onClick={() => handleStatusChange(customer.id, customer.status || 'Active')}>
              {customer.status === 'Active' ? 'Khóa Tenant' : 'Mở khóa Tenant'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

const InvoicesView: React.FC<{ invoices: InvoiceResponse[]; onReload: () => void }> = ({ invoices, onReload }) => {
  const markAsPaid = async (id: string) => {
    await platformApi.updateInvoiceStatus(id, 'Paid');
    await onReload();
  };

  return (
    <section className="card glass bizops-panel">
      <div className="bizops-panel-title">
        <div><ReceiptText size={18} /><h2>Danh sách hóa đơn</h2></div>
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
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td><strong>{invoice.invoiceNumber}</strong></td>
                <td>{invoice.companyName}</td>
                <td>{formatVnd(invoice.totalAmount)}</td>
                <td>{new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}</td>
                <td>{new Date(invoice.dueAt).toLocaleDateString('vi-VN')}</td>
                <td>{statusPill(invoice.status)}</td>
                <td>
                  {invoice.status !== 'Paid' && <button onClick={() => markAsPaid(invoice.id)}>Đánh dấu đã thanh toán</button>}
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

const SupportView: React.FC<{ tickets: TicketResponse[]; onReload: () => void }> = ({ tickets, onReload }) => {
  const updateStatus = async (id: string, status: string) => {
    await platformApi.updateTicket(id, { status });
    await onReload();
  };

  return (
    <section className="card glass bizops-panel">
      <div className="bizops-panel-title">
        <div><Headphones size={18} /><h2>Hỗ trợ / Ticket</h2></div>
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
            {tickets.map(ticket => (
              <tr key={ticket.id}>
                <td><strong>{ticket.ticketNumber}</strong></td>
                <td>{ticket.subject}</td>
                <td>{priorityPill(ticket.priority)}</td>
                <td>{ticketStatusPill(ticket.status)}</td>
                <td>{new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</td>
                <td>
                  <div className="bizops-actions">
                    {ticket.status === 'Open' && <button onClick={() => updateStatus(ticket.id, 'In Progress')}>Xử lý</button>}
                    {ticket.status !== 'Resolved' && <button onClick={() => updateStatus(ticket.id, 'Resolved')}>Đóng</button>}
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
