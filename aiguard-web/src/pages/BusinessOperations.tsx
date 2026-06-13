import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Copy,
  Download,
  FileSignature,
  FileText,
  Headphones,
  KeyRound,
  Lock,
  PackageCheck,
  Plus,
  ReceiptText,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  TicketCheck,
  Unlock,
  Upload,
  Users,
  XCircle
} from 'lucide-react';

type BusinessView =
  | 'orders'
  | 'licenses'
  | 'customers'
  | 'invoices'
  | 'onboarding'
  | 'company'
  | 'quotations'
  | 'support';

type OrderStatus = 'waiting' | 'reviewing' | 'paid' | 'cancelled';
type LicenseStatus = 'active' | 'locked' | 'expired';
type CustomerStatus = 'trial' | 'paid' | 'expired';
type TicketStatus = 'open' | 'in-progress' | 'resolved';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface BusinessViewConfig {
  key: BusinessView;
  path: string;
  title: string;
  subtitle: string;
}

interface OrderRow {
  id: string;
  customer: string;
  contact: string;
  plan: string;
  users: number;
  total: number;
  status: OrderStatus;
  receipt: string;
  createdAt: string;
}

interface LicenseRow {
  key: string;
  tenant: string;
  plan: string;
  startDate: string;
  endDate: string;
  users: number;
  devices: number;
  status: LicenseStatus;
}

interface CustomerRow {
  company: string;
  contact: string;
  email: string;
  phone: string;
  plan: string;
  status: CustomerStatus;
  note: string;
}

interface InvoiceRow {
  id: string;
  customer: string;
  amount: number;
  issueDate: string;
  paymentStatus: string;
  vatStatus: string;
  contractStatus: string;
  receipt: string;
}

interface TicketRow {
  id: string;
  customer: string;
  title: string;
  priority: Priority;
  status: TicketStatus;
  sla: string;
  lastUpdate: string;
}

const businessViews: BusinessViewConfig[] = [
  { key: 'orders', path: '/app/business/orders', title: 'Quản lý đơn hàng', subtitle: 'Theo dõi đơn, biên lai, trạng thái thanh toán và cấp license sau khi xác nhận.' },
  { key: 'licenses', path: '/app/business/licenses', title: 'Quản lý License', subtitle: 'Kiểm soát license key, tenant, gói dịch vụ, hạn dùng, số user và số thiết bị.' },
  { key: 'customers', path: '/app/business/customers', title: 'Tenant CRM', subtitle: 'Quản lý công ty khách hàng, người liên hệ, trạng thái trial/paid/expired và ghi chú sales.' },
  { key: 'invoices', path: '/app/business/invoices', title: 'Hóa đơn & thanh toán', subtitle: 'Danh sách invoice, báo giá, biên lai, trạng thái VAT, hợp đồng và lịch sử thanh toán.' },
  { key: 'onboarding', path: '/app/business/onboarding', title: 'Trial / Onboarding', subtitle: 'Tạo tenant demo, admin khách hàng, enrollment token và checklist triển khai extension.' },
  { key: 'company', path: '/app/business/company', title: 'Cấu hình công ty', subtitle: 'Thiết lập tenant, domain, logo, retention, tài khoản ngân hàng và payment webhook.' },
  { key: 'quotations', path: '/app/business/quotations', title: 'Hợp đồng / báo giá', subtitle: 'Tạo quotation, chọn gói, số user, discount, điều khoản triển khai và xuất PDF.' },
  { key: 'support', path: '/app/business/support', title: 'Support / Ticket', subtitle: 'Tiếp nhận lỗi, yêu cầu hỗ trợ triển khai, theo dõi SLA và lịch sử trao đổi.' }
];

const initialOrders: OrderRow[] = [
  { id: 'ORD-2026-001', customer: 'Công ty Sao Việt Tech', contact: 'Linh Nguyễn', plan: 'Professional', users: 120, total: 280800000, status: 'reviewing', receipt: 'bien-lai-sao-viet.pdf', createdAt: '13/06/2026' },
  { id: 'ORD-2026-002', customer: 'FinTrust Finance', contact: 'Minh Trần', plan: 'Enterprise', users: 450, total: 2430000000, status: 'waiting', receipt: 'chưa upload', createdAt: '12/06/2026' },
  { id: 'ORD-2026-003', customer: 'HRPlus BPO', contact: 'Hà Phạm', plan: 'Starter', users: 45, total: 32400000, status: 'paid', receipt: 'hrplus-vcb.png', createdAt: '10/06/2026' },
  { id: 'ORD-2026-004', customer: 'Agency Nova', contact: 'Quân Lê', plan: 'Professional', users: 60, total: 116640000, status: 'cancelled', receipt: 'agency-nova.jpg', createdAt: '08/06/2026' }
];

const initialLicenses: LicenseRow[] = [
  { key: 'AIG-PRO-SVT-2026-9K2H', tenant: 'sao-viet-tech', plan: 'Professional', startDate: '13/06/2026', endDate: '13/06/2027', users: 120, devices: 180, status: 'active' },
  { key: 'AIG-ENT-FIN-2026-71XD', tenant: 'fintrust-finance', plan: 'Enterprise', startDate: '01/06/2026', endDate: '01/06/2027', users: 450, devices: 720, status: 'active' },
  { key: 'AIG-STA-HRP-2026-2MXA', tenant: 'hrplus-bpo', plan: 'Starter', startDate: '01/05/2026', endDate: '01/08/2026', users: 45, devices: 60, status: 'locked' }
];

const initialCustomers: CustomerRow[] = [
  { company: 'Công ty Sao Việt Tech', contact: 'Linh Nguyễn', email: 'linh@saoviet.vn', phone: '0901 111 222', plan: 'Professional', status: 'paid', note: 'Muốn mở rộng sang phòng HR trong tháng tới.' },
  { company: 'FinTrust Finance', contact: 'Minh Trần', email: 'minh@fintrust.vn', phone: '0902 222 333', plan: 'Enterprise', status: 'trial', note: 'Yêu cầu SSO, SIEM và private cloud.' },
  { company: 'HRPlus BPO', contact: 'Hà Phạm', email: 'ha@hrplus.vn', phone: '0903 333 444', plan: 'Starter', status: 'paid', note: 'Đang dùng cho team tuyển dụng.' },
  { company: 'Agency Nova', contact: 'Quân Lê', email: 'quan@nova.agency', phone: '0904 444 555', plan: 'Professional', status: 'expired', note: 'Cần follow-up vì trial đã hết hạn.' }
];

const invoices: InvoiceRow[] = [
  { id: 'INV-2026-001', customer: 'Công ty Sao Việt Tech', amount: 280800000, issueDate: '13/06/2026', paymentStatus: 'Đã thanh toán', vatStatus: 'Chờ xuất VAT', contractStatus: 'Đã ký', receipt: 'bien-lai-sao-viet.pdf' },
  { id: 'INV-2026-002', customer: 'FinTrust Finance', amount: 2430000000, issueDate: '12/06/2026', paymentStatus: 'Chờ thanh toán', vatStatus: 'Chưa xuất', contractStatus: 'Đang pháp chế duyệt', receipt: 'chưa có' },
  { id: 'INV-2026-003', customer: 'HRPlus BPO', amount: 32400000, issueDate: '10/06/2026', paymentStatus: 'Đã thanh toán', vatStatus: 'Đã xuất VAT', contractStatus: 'Đã ký', receipt: 'hrplus-vcb.png' }
];

const initialTickets: TicketRow[] = [
  { id: 'SUP-101', customer: 'Công ty Sao Việt Tech', title: 'Extension không đồng bộ policy trên 3 máy', priority: 'high', status: 'in-progress', sla: 'Còn 2 giờ', lastUpdate: '13/06/2026 14:20' },
  { id: 'SUP-102', customer: 'FinTrust Finance', title: 'Cần hỗ trợ cấu hình SIEM webhook', priority: 'medium', status: 'open', sla: 'Còn 1 ngày', lastUpdate: '13/06/2026 09:10' },
  { id: 'SUP-103', customer: 'HRPlus BPO', title: 'Yêu cầu training thêm cho manager', priority: 'low', status: 'resolved', sla: 'Đúng hạn', lastUpdate: '11/06/2026 16:45' }
];

const onboardingSteps = [
  'Tạo tenant demo',
  'Tạo tài khoản admin cho khách',
  'Sinh enrollment token',
  'Cài extension trên máy pilot',
  'Thêm user/phòng ban',
  'Bật policy mẫu',
  'Test prompt chứa dữ liệu nhạy cảm'
];

export const BusinessOperations: React.FC = () => {
  const location = useLocation();
  const activeView = getActiveView(location.pathname);
  const view = businessViews.find(item => item.key === activeView) ?? businessViews[0];

  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [licenses, setLicenses] = useState<LicenseRow[]>(initialLicenses);
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers);
  const [tickets, setTickets] = useState<TicketRow[]>(initialTickets);
  const [selectedReceipt, setSelectedReceipt] = useState<OrderRow | null>(orders[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedValue, setCopiedValue] = useState('');
  const [companySettings, setCompanySettings] = useState({
    logoName: '',
    tenantName: 'AIGuard Demo Tenant',
    domain: 'demo.aiguard.vn',
    retentionDays: 90,
    bankAccount: '0123456789 - AIGUARD JSC',
    paymentWebhook: 'https://api.aiguard.vn/webhooks/payment',
    autoVat: false
  });
  const [onboardingDone, setOnboardingDone] = useState<Record<string, boolean>>({
    'Tạo tenant demo': true,
    'Tạo tài khoản admin cho khách': true,
    'Sinh enrollment token': true
  });
  const [onboardingToken, setOnboardingToken] = useState('ENR-SVT-2026-K9M2-READY');
  const [quotation, setQuotation] = useState({
    customer: 'Công ty Sao Việt Tech',
    plan: 'Professional',
    users: 120,
    discount: 10,
    deploymentFee: 45000000,
    terms: 'Thanh toán 100% trước khi kích hoạt license. Miễn phí hỗ trợ online 30 ngày đầu.'
  });

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter(order =>
      [order.id, order.customer, order.contact, order.plan].some(value => value.toLowerCase().includes(term))
    );
  }, [orders, searchTerm]);

  const quotationTotal = useMemo(() => {
    const pricePerUser = quotation.plan === 'Enterprise' ? 450000 : quotation.plan === 'Professional' ? 180000 : 60000;
    const annual = pricePerUser * quotation.users * 12;
    return Math.round(annual * (1 - quotation.discount / 100) + quotation.deploymentFee);
  }, [quotation]);

  const confirmOrder = (orderId: string) => {
    setOrders(previous => previous.map(order => order.id === orderId ? { ...order, status: 'paid' } : order));
  };

  const cancelOrder = (orderId: string) => {
    setOrders(previous => previous.map(order => order.id === orderId ? { ...order, status: 'cancelled' } : order));
  };

  const createLicenseFromOrder = (order: OrderRow) => {
    const tenant = slugify(order.customer);
    const licenseKey = `AIG-${order.plan.slice(0, 3).toUpperCase()}-${tenant.slice(0, 3).toUpperCase()}-2026-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const exists = licenses.some(license => license.key === licenseKey || license.tenant === tenant);
    if (exists) return;

    setLicenses(previous => [
      {
        key: licenseKey,
        tenant,
        plan: order.plan,
        startDate: '13/06/2026',
        endDate: '13/06/2027',
        users: order.users,
        devices: Math.round(order.users * 1.5),
        status: 'active'
      },
      ...previous
    ]);
  };

  const toggleLicenseLock = (licenseKey: string) => {
    setLicenses(previous => previous.map(license =>
      license.key === licenseKey
        ? { ...license, status: license.status === 'locked' ? 'active' : 'locked' }
        : license
    ));
  };

  const renewLicense = (licenseKey: string) => {
    setLicenses(previous => previous.map(license =>
      license.key === licenseKey ? { ...license, endDate: '13/06/2028', status: 'active' } : license
    ));
  };

  const upgradeLicense = (licenseKey: string) => {
    setLicenses(previous => previous.map(license =>
      license.key === licenseKey
        ? { ...license, plan: 'Enterprise', users: Math.max(license.users, 300), devices: Math.max(license.devices, 500), status: 'active' }
        : license
    ));
  };

  const addCustomer = () => {
    const newIndex = customers.length + 1;
    setCustomers(previous => [
      {
        company: `Khách hàng mới ${newIndex}`,
        contact: 'Người phụ trách',
        email: `contact${newIndex}@example.com`,
        phone: '0900 000 000',
        plan: 'Trial',
        status: 'trial',
        note: 'Lead mới cần sales follow-up trong 24 giờ.'
      },
      ...previous
    ]);
  };

  const createTicket = () => {
    const nextId = `SUP-${100 + tickets.length + 1}`;
    setTickets(previous => [
      {
        id: nextId,
        customer: 'Khách hàng mới',
        title: 'Yêu cầu hỗ trợ triển khai extension',
        priority: 'medium',
        status: 'open',
        sla: 'Còn 8 giờ',
        lastUpdate: '13/06/2026 15:00'
      },
      ...previous
    ]);
  };

  const copyText = (value: string) => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(value).then(() => {
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

      <section className="bizops-metrics">
        <MetricCard icon={<ClipboardList />} label="Đơn hàng mở" value={String(orders.filter(order => order.status !== 'paid' && order.status !== 'cancelled').length)} tone="blue" />
        <MetricCard icon={<KeyRound />} label="License active" value={String(licenses.filter(license => license.status === 'active').length)} tone="green" />
        <MetricCard icon={<Users />} label="Tenant paid" value={String(customers.filter(customer => customer.status === 'paid').length)} tone="purple" />
        <MetricCard icon={<Headphones />} label="Ticket chưa xong" value={String(tickets.filter(ticket => ticket.status !== 'resolved').length)} tone="amber" />
      </section>

      {activeView === 'orders' && (
        <OrdersView
          orders={filteredOrders}
          searchTerm={searchTerm}
          selectedReceipt={selectedReceipt}
          onSearch={setSearchTerm}
          onSelectReceipt={setSelectedReceipt}
          onConfirm={confirmOrder}
          onCancel={cancelOrder}
          onCreateLicense={createLicenseFromOrder}
        />
      )}

      {activeView === 'licenses' && (
        <LicensesView
          licenses={licenses}
          copiedValue={copiedValue}
          onCopy={copyText}
          onToggleLock={toggleLicenseLock}
          onRenew={renewLicense}
          onUpgrade={upgradeLicense}
        />
      )}

      {activeView === 'customers' && (
        <CustomersView customers={customers} onAddCustomer={addCustomer} />
      )}

      {activeView === 'invoices' && (
        <InvoicesView invoices={invoices} />
      )}

      {activeView === 'onboarding' && (
        <OnboardingView
          onboardingDone={onboardingDone}
          token={onboardingToken}
          copiedValue={copiedValue}
          onCopy={copyText}
          onToggleStep={(step) => setOnboardingDone(previous => ({ ...previous, [step]: !previous[step] }))}
          onGenerateToken={() => setOnboardingToken(`ENR-DEMO-2026-${Math.random().toString(36).slice(2, 8).toUpperCase()}`)}
        />
      )}

      {activeView === 'company' && (
        <CompanySettingsView
          settings={companySettings}
          onChange={setCompanySettings}
        />
      )}

      {activeView === 'quotations' && (
        <QuotationsView
          quotation={quotation}
          total={quotationTotal}
          onChange={setQuotation}
        />
      )}

      {activeView === 'support' && (
        <SupportView tickets={tickets} onCreateTicket={createTicket} />
      )}
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'blue' | 'green' | 'purple' | 'amber';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, tone }) => (
  <div className={`bizops-metric card glass ${tone}`}>
    <span>{icon}</span>
    <div>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  </div>
);

interface OrdersViewProps {
  orders: OrderRow[];
  searchTerm: string;
  selectedReceipt: OrderRow | null;
  onSearch: (value: string) => void;
  onSelectReceipt: (order: OrderRow) => void;
  onConfirm: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onCreateLicense: (order: OrderRow) => void;
}

const OrdersView: React.FC<OrdersViewProps> = ({ orders, searchTerm, selectedReceipt, onSearch, onSelectReceipt, onConfirm, onCancel, onCreateLicense }) => (
  <div className="bizops-split">
    <section className="card glass bizops-panel">
      <PanelTitle icon={<ClipboardList size={18} />} title="Danh sách đơn hàng" action={<SearchBox value={searchTerm} onChange={onSearch} />} />
      <div className="bizops-table-wrap">
        <table className="bizops-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Gói</th>
              <th>User</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Biên lai</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td><strong>{order.id}</strong><small>{order.createdAt}</small></td>
                <td>{order.customer}<small>{order.contact}</small></td>
                <td>{order.plan}</td>
                <td>{order.users}</td>
                <td>{formatVnd(order.total)}</td>
                <td>{statusPill(order.status)}</td>
                <td><button className="bizops-link-btn" onClick={() => onSelectReceipt(order)}>Xem</button></td>
                <td>
                  <div className="bizops-actions">
                    <button onClick={() => onConfirm(order.id)} disabled={order.status === 'paid'}>Xác nhận</button>
                    <button onClick={() => onCreateLicense(order)} disabled={order.status !== 'paid'}>Tạo license</button>
                    <button className="danger" onClick={() => onCancel(order.id)} disabled={order.status === 'cancelled'}>Hủy</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <aside className="card glass bizops-side-card">
      <PanelTitle icon={<Upload size={18} />} title="Biên lai đã upload" />
      {selectedReceipt ? (
        <div className="receipt-preview">
          <div className="receipt-paper">
            <ReceiptText size={36} />
            <strong>{selectedReceipt.receipt}</strong>
            <span>{selectedReceipt.id}</span>
          </div>
          <p>Khách hàng: <b>{selectedReceipt.customer}</b></p>
          <p>Số tiền: <b>{formatVnd(selectedReceipt.total)}</b></p>
          <button className="btn-secondary"><Download size={14} /> Tải biên lai</button>
        </div>
      ) : (
        <p className="bizops-muted">Chọn một đơn hàng để xem biên lai.</p>
      )}
    </aside>
  </div>
);

interface LicensesViewProps {
  licenses: LicenseRow[];
  copiedValue: string;
  onCopy: (value: string) => void;
  onToggleLock: (licenseKey: string) => void;
  onRenew: (licenseKey: string) => void;
  onUpgrade: (licenseKey: string) => void;
}

const LicensesView: React.FC<LicensesViewProps> = ({ licenses, copiedValue, onCopy, onToggleLock, onRenew, onUpgrade }) => (
  <section className="card glass bizops-panel">
    <PanelTitle icon={<KeyRound size={18} />} title="License key theo tenant" action={<button className="btn-primary"><Plus size={14} /> Tạo license thủ công</button>} />
    <div className="bizops-table-wrap">
      <table className="bizops-table">
        <thead>
          <tr>
            <th>License key</th>
            <th>Tenant</th>
            <th>Gói</th>
            <th>Hiệu lực</th>
            <th>User</th>
            <th>Thiết bị</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {licenses.map(license => (
            <tr key={license.key}>
              <td>
                <code>{license.key}</code>
                <button className="bizops-inline-copy" onClick={() => onCopy(license.key)}>
                  {copiedValue === license.key ? <CheckCircle2 size={13} /> : <Copy size={13} />} Copy
                </button>
              </td>
              <td>{license.tenant}</td>
              <td>{license.plan}</td>
              <td>{license.startDate}<small>Đến {license.endDate}</small></td>
              <td>{license.users}</td>
              <td>{license.devices}</td>
              <td>{licenseStatusPill(license.status)}</td>
              <td>
                <div className="bizops-actions">
                  <button onClick={() => onRenew(license.key)}><RefreshCw size={13} /> Gia hạn</button>
                  <button onClick={() => onToggleLock(license.key)}>{license.status === 'locked' ? <Unlock size={13} /> : <Lock size={13} />} {license.status === 'locked' ? 'Mở khóa' : 'Khóa'}</button>
                  <button onClick={() => onUpgrade(license.key)}>Nâng cấp</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

interface CustomersViewProps {
  customers: CustomerRow[];
  onAddCustomer: () => void;
}

const CustomersView: React.FC<CustomersViewProps> = ({ customers, onAddCustomer }) => (
  <div className="bizops-split">
    <section className="card glass bizops-panel">
      <PanelTitle icon={<Building2 size={18} />} title="Khách hàng / Tenant CRM" action={<button className="btn-primary" onClick={onAddCustomer}><Plus size={14} /> Thêm khách</button>} />
      <div className="bizops-crm-grid">
        {customers.map(customer => (
          <div className="bizops-crm-card" key={customer.company}>
            <div className="crm-head">
              <div>
                <strong>{customer.company}</strong>
                <span>{customer.contact}</span>
              </div>
              {customerStatusPill(customer.status)}
            </div>
            <p>{customer.email}</p>
            <p>{customer.phone}</p>
            <div className="crm-plan">{customer.plan}</div>
            <small>{customer.note}</small>
          </div>
        ))}
      </div>
    </section>
    <aside className="card glass bizops-side-card">
      <PanelTitle icon={<Users size={18} />} title="Sales checklist" />
      <Checklist items={['Xác nhận domain email doanh nghiệp', 'Xác định số user pilot', 'Chọn gói phù hợp', 'Gửi báo giá PDF', 'Đặt lịch demo kỹ thuật']} />
    </aside>
  </div>
);

const InvoicesView: React.FC<{ invoices: InvoiceRow[] }> = ({ invoices }) => (
  <div className="bizops-split">
    <section className="card glass bizops-panel">
      <PanelTitle icon={<ReceiptText size={18} />} title="Danh sách invoice" action={<button className="btn-primary"><FileText size={14} /> Xuất invoice mới</button>} />
      <div className="bizops-table-wrap">
        <table className="bizops-table">
          <thead>
            <tr>
              <th>Mã invoice</th>
              <th>Khách hàng</th>
              <th>Số tiền</th>
              <th>Ngày phát hành</th>
              <th>Thanh toán</th>
              <th>VAT</th>
              <th>Hợp đồng</th>
              <th>Tệp</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td><strong>{invoice.id}</strong></td>
                <td>{invoice.customer}</td>
                <td>{formatVnd(invoice.amount)}</td>
                <td>{invoice.issueDate}</td>
                <td>{invoice.paymentStatus}</td>
                <td>{invoice.vatStatus}</td>
                <td>{invoice.contractStatus}</td>
                <td>
                  <div className="bizops-actions">
                    <button><Download size={13} /> PDF</button>
                    <button><ReceiptText size={13} /> Biên lai</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
    <aside className="card glass bizops-side-card">
      <PanelTitle icon={<CalendarClock size={18} />} title="Lịch sử thanh toán" />
      <Timeline items={['13/06: Nhận biên lai Sao Việt Tech', '13/06: Kế toán đang xuất VAT', '12/06: Gửi invoice FinTrust Finance', '10/06: HRPlus thanh toán thành công']} />
    </aside>
  </div>
);

interface OnboardingViewProps {
  onboardingDone: Record<string, boolean>;
  token: string;
  copiedValue: string;
  onCopy: (value: string) => void;
  onToggleStep: (step: string) => void;
  onGenerateToken: () => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onboardingDone, token, copiedValue, onCopy, onToggleStep, onGenerateToken }) => (
  <div className="bizops-split">
    <section className="card glass bizops-panel">
      <PanelTitle icon={<Rocket size={18} />} title="Tạo tenant demo" />
      <div className="bizops-form-grid">
        <label>Tên công ty<input defaultValue="Công ty Sao Việt Tech" /></label>
        <label>Domain email<input defaultValue="saoviet.vn" /></label>
        <label>Admin name<input defaultValue="Linh Nguyễn" /></label>
        <label>Admin email<input defaultValue="linh@saoviet.vn" /></label>
      </div>
      <div className="token-box">
        <div>
          <span>Enrollment token</span>
          <code>{token}</code>
        </div>
        <button className="btn-secondary" onClick={onGenerateToken}><RefreshCw size={14} /> Sinh lại</button>
        <button className="btn-primary" onClick={() => onCopy(token)}>{copiedValue === token ? <CheckCircle2 size={14} /> : <Copy size={14} />} Copy token</button>
      </div>
      <div className="onboarding-guide">
        <strong>Hướng dẫn cài extension</strong>
        <ol>
          <li>Tải extension build từ trang Deployment.</li>
          <li>Mở Chrome Extensions và bật Developer mode.</li>
          <li>Load unpacked extension, nhập enrollment token.</li>
          <li>Test bằng prompt có email, số điện thoại hoặc API key.</li>
        </ol>
      </div>
    </section>
    <aside className="card glass bizops-side-card">
      <PanelTitle icon={<ClipboardCheck size={18} />} title="Checklist triển khai" />
      <div className="bizops-checklist">
        {onboardingSteps.map(step => (
          <label key={step}>
            <input type="checkbox" checked={Boolean(onboardingDone[step])} onChange={() => onToggleStep(step)} />
            <span>{step}</span>
          </label>
        ))}
      </div>
    </aside>
  </div>
);

interface CompanySettingsViewProps {
  settings: {
    logoName: string;
    tenantName: string;
    domain: string;
    retentionDays: number;
    bankAccount: string;
    paymentWebhook: string;
    autoVat: boolean;
  };
  onChange: React.Dispatch<React.SetStateAction<CompanySettingsViewProps['settings']>>;
}

const CompanySettingsView: React.FC<CompanySettingsViewProps> = ({ settings, onChange }) => (
  <section className="card glass bizops-panel">
    <PanelTitle icon={<Settings size={18} />} title="Cấu hình công ty / tenant" action={<button className="btn-primary"><CheckCircle2 size={14} /> Lưu cấu hình</button>} />
    <div className="company-settings-grid">
      <div className="company-logo-box">
        <div className="company-logo-preview">{settings.logoName ? settings.logoName.slice(0, 2).toUpperCase() : 'AI'}</div>
        <strong>Logo công ty</strong>
        <span>{settings.logoName || 'Chưa upload logo'}</span>
        <label className="btn-secondary payment-upload-button">
          <Upload size={14} /> Upload logo
          <input type="file" accept="image/*" onChange={event => onChange(previous => ({ ...previous, logoName: event.currentTarget.files?.[0]?.name ?? previous.logoName }))} />
        </label>
      </div>
      <div className="bizops-form-grid">
        <label>Tên tenant<input value={settings.tenantName} onChange={event => onChange(previous => ({ ...previous, tenantName: event.target.value }))} /></label>
        <label>Domain email công ty<input value={settings.domain} onChange={event => onChange(previous => ({ ...previous, domain: event.target.value }))} /></label>
        <label>Retention mặc định<input type="number" value={settings.retentionDays} onChange={event => onChange(previous => ({ ...previous, retentionDays: Number(event.target.value) }))} /></label>
        <label>Tài khoản ngân hàng<input value={settings.bankAccount} onChange={event => onChange(previous => ({ ...previous, bankAccount: event.target.value }))} /></label>
        <label className="wide">Payment webhook<input value={settings.paymentWebhook} onChange={event => onChange(previous => ({ ...previous, paymentWebhook: event.target.value }))} /></label>
        <label className="bizops-check-row"><input type="checkbox" checked={settings.autoVat} onChange={event => onChange(previous => ({ ...previous, autoVat: event.target.checked }))} /> Tự động tạo yêu cầu xuất VAT sau khi đơn đã thanh toán</label>
      </div>
    </div>
  </section>
);

interface QuotationsViewProps {
  quotation: {
    customer: string;
    plan: string;
    users: number;
    discount: number;
    deploymentFee: number;
    terms: string;
  };
  total: number;
  onChange: React.Dispatch<React.SetStateAction<QuotationsViewProps['quotation']>>;
}

const QuotationsView: React.FC<QuotationsViewProps> = ({ quotation, total, onChange }) => (
  <div className="bizops-split">
    <section className="card glass bizops-panel">
      <PanelTitle icon={<FileSignature size={18} />} title="Tạo báo giá / hợp đồng" />
      <div className="bizops-form-grid">
        <label>Khách hàng<input value={quotation.customer} onChange={event => onChange(previous => ({ ...previous, customer: event.target.value }))} /></label>
        <label>Gói<select value={quotation.plan} onChange={event => onChange(previous => ({ ...previous, plan: event.target.value }))}><option>Starter</option><option>Professional</option><option>Enterprise</option></select></label>
        <label>Số user<input type="number" value={quotation.users} onChange={event => onChange(previous => ({ ...previous, users: Number(event.target.value) }))} /></label>
        <label>Discount %<input type="number" value={quotation.discount} onChange={event => onChange(previous => ({ ...previous, discount: Number(event.target.value) }))} /></label>
        <label>Phí triển khai<input type="number" value={quotation.deploymentFee} onChange={event => onChange(previous => ({ ...previous, deploymentFee: Number(event.target.value) }))} /></label>
        <label className="wide">Điều khoản triển khai<textarea value={quotation.terms} onChange={event => onChange(previous => ({ ...previous, terms: event.target.value }))} /></label>
      </div>
    </section>
    <aside className="card glass bizops-side-card quotation-preview">
      <PanelTitle icon={<FileText size={18} />} title="Preview báo giá" />
      <strong>{quotation.customer}</strong>
      <p>Gói {quotation.plan} · {quotation.users} users · Discount {quotation.discount}%</p>
      <div className="quotation-total">{formatVnd(total)}</div>
      <small>{quotation.terms}</small>
      <button className="btn-primary"><Download size={14} /> Xuất PDF báo giá</button>
      <button className="btn-secondary"><FileSignature size={14} /> Tạo hợp đồng</button>
    </aside>
  </div>
);

const SupportView: React.FC<{ tickets: TicketRow[]; onCreateTicket: () => void }> = ({ tickets, onCreateTicket }) => (
  <div className="bizops-split">
    <section className="card glass bizops-panel">
      <PanelTitle icon={<Headphones size={18} />} title="Support / Ticket" action={<button className="btn-primary" onClick={onCreateTicket}><Plus size={14} /> Tạo ticket</button>} />
      <div className="bizops-table-wrap">
        <table className="bizops-table">
          <thead>
            <tr>
              <th>Mã ticket</th>
              <th>Khách hàng</th>
              <th>Nội dung</th>
              <th>Ưu tiên</th>
              <th>Trạng thái</th>
              <th>SLA</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(ticket => (
              <tr key={ticket.id}>
                <td><strong>{ticket.id}</strong></td>
                <td>{ticket.customer}</td>
                <td>{ticket.title}</td>
                <td>{priorityPill(ticket.priority)}</td>
                <td>{ticketStatusPill(ticket.status)}</td>
                <td>{ticket.sla}</td>
                <td>{ticket.lastUpdate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
    <aside className="card glass bizops-side-card">
      <PanelTitle icon={<TicketCheck size={18} />} title="Lịch sử trao đổi" />
      <Timeline items={['15:00: Tạo ticket mới từ portal khách hàng', '14:20: Support yêu cầu gửi log extension', '10:40: Customer Success gọi xác nhận lỗi', '09:10: Khách gửi yêu cầu hỗ trợ SIEM']} />
    </aside>
  </div>
);

const PanelTitle: React.FC<{ icon: React.ReactNode; title: string; action?: React.ReactNode }> = ({ icon, title, action }) => (
  <div className="bizops-panel-title">
    <div>{icon}<h2>{title}</h2></div>
    {action}
  </div>
);

const SearchBox: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => (
  <label className="bizops-search">
    <Search size={14} />
    <input value={value} onChange={event => onChange(event.target.value)} placeholder="Tìm mã đơn, khách hàng, gói..." />
  </label>
);

const Checklist: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="bizops-checklist static">
    {items.map((item, index) => (
      <label key={item}>
        <input type="checkbox" defaultChecked={index < 2} />
        <span>{item}</span>
      </label>
    ))}
  </div>
);

const Timeline: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="bizops-timeline">
    {items.map(item => (
      <div key={item}><Clock size={14} /><span>{item}</span></div>
    ))}
  </div>
);

function getActiveView(pathname: string): BusinessView {
  if (pathname.includes('/licenses')) return 'licenses';
  if (pathname.includes('/customers')) return 'customers';
  if (pathname.includes('/invoices')) return 'invoices';
  if (pathname.includes('/onboarding')) return 'onboarding';
  if (pathname.includes('/company')) return 'company';
  if (pathname.includes('/quotations')) return 'quotations';
  if (pathname.includes('/support')) return 'support';
  return 'orders';
}

function businessViewIcon(view: BusinessView) {
  const props = { size: 15 };
  switch (view) {
    case 'orders': return <ClipboardList {...props} />;
    case 'licenses': return <KeyRound {...props} />;
    case 'customers': return <Building2 {...props} />;
    case 'invoices': return <ReceiptText {...props} />;
    case 'onboarding': return <Rocket {...props} />;
    case 'company': return <Settings {...props} />;
    case 'quotations': return <FileSignature {...props} />;
    case 'support': return <Headphones {...props} />;
  }
}

function statusPill(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    waiting: 'Chờ thanh toán',
    reviewing: 'Đang đối soát',
    paid: 'Đã thanh toán',
    cancelled: 'Đã hủy'
  };
  return <span className={`bizops-status ${status}`}>{statusIcon(status)}{labels[status]}</span>;
}

function statusIcon(status: OrderStatus) {
  if (status === 'paid') return <CheckCircle2 size={13} />;
  if (status === 'cancelled') return <XCircle size={13} />;
  if (status === 'reviewing') return <Clock size={13} />;
  return <AlertCircle size={13} />;
}

function licenseStatusPill(status: LicenseStatus) {
  const labels: Record<LicenseStatus, string> = { active: 'Active', locked: 'Đã khóa', expired: 'Hết hạn' };
  return <span className={`bizops-status ${status}`}>{status === 'active' ? <BadgeCheck size={13} /> : <Lock size={13} />}{labels[status]}</span>;
}

function customerStatusPill(status: CustomerStatus) {
  const labels: Record<CustomerStatus, string> = { trial: 'Trial', paid: 'Paid', expired: 'Expired' };
  return <span className={`bizops-status ${status}`}>{labels[status]}</span>;
}

function ticketStatusPill(status: TicketStatus) {
  const labels: Record<TicketStatus, string> = { open: 'Mở', 'in-progress': 'Đang xử lý', resolved: 'Đã xong' };
  return <span className={`bizops-status ${status}`}>{labels[status]}</span>;
}

function priorityPill(priority: Priority) {
  const labels: Record<Priority, string> = { low: 'Thấp', medium: 'Vừa', high: 'Cao', urgent: 'Khẩn cấp' };
  return <span className={`bizops-priority ${priority}`}>{labels[priority]}</span>;
}

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default BusinessOperations;
