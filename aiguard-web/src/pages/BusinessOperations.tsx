import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, BadgeCheck, Building2, CheckSquare, ClipboardList,
  Copy, DollarSign, Edit, FileText, Headphones,
  KeyRound, Laptop, PackageCheck, Plus, ReceiptText, RefreshCw,
  Save, Settings, Shield, Terminal, Trash2, Users, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  businessApi,
  type ContactRequest,
  type ContactResponse,
  type QuotationResponse,
  type SubscriptionResponse,
  type TenantSettingsRequest,
  type TenantSettingsResponse
} from '../api/business';
import { platformApi } from '../api/platform';
import type {
  BusinessDashboardResponse,
  InvoiceResponse,
  LicenseResponse,
  OnboardingListResponse,
  OrderResponse,
  PaymentResponse,
  TenantResponse,
  TicketResponse,
  OnboardingResponse,
  EnrollmentTokenResponse,
  ProductPlanResponse
} from '../api/platform';

type BusinessView =
  | 'dashboard' | 'orders' | 'payments' | 'licenses'
  | 'customers' | 'invoices' | 'onboarding' | 'company'
  | 'quotations' | 'subscriptions' | 'support';

const businessViews: Record<BusinessView, { title: string; subtitle: string }> = {
  dashboard:       { title: 'Tổng quan',          subtitle: 'Tổng quan hệ thống SaaS và hoạt động kinh doanh.' },
  customers:        { title: 'Khách hàng / Tenant CRM', subtitle: 'Quản lý công ty khách hàng, người liên hệ và trạng thái tenant.' },
  orders:           { title: 'Quản lý đơn hàng',   subtitle: 'Theo dõi đơn, biên lai, trạng thái thanh toán và cấp license sau khi xác nhận.' },
  payments:         { title: 'Lịch sử thanh toán', subtitle: 'Theo dõi các giao dịch thanh toán và trạng thái kích hoạt gói.' },
  licenses:         { title: 'Quản lý License',    subtitle: 'Kiểm soát license key, tenant, gói dịch vụ, hạn dùng, số user và thiết bị.' },
  subscriptions:    { title: 'Gói & Subscription', subtitle: 'Theo dõi usage so với limit, thông tin gói hiện tại và hạn sử dụng.' },
  invoices:         { title: 'Hóa đơn & thanh toán', subtitle: 'Danh sách invoice, báo giá và biên lai.' },
  support:          { title: 'Hỗ trợ / Ticket',    subtitle: 'Tiếp nhận lỗi và yêu cầu hỗ trợ triển khai.' },
  onboarding:       { title: 'Trial / Onboarding',  subtitle: 'Checklist triển khai và enrollment token.' },
  company:           { title: 'Cấu hình công ty',   subtitle: 'Thiết lập tenant, domain, logo và tài khoản ngân hàng.' },
  quotations:       { title: 'Báo giá & Hợp đồng', subtitle: 'Tạo báo giá, chuyển đổi thành đơn hàng và quản lý hợp đồng.' }
};

function getActiveView(pathname: string): BusinessView {
  if (pathname.includes('/customers'))    return 'customers';
  if (pathname.includes('/payments'))    return 'payments';
  if (pathname.includes('/orders'))       return 'orders';
  if (pathname.includes('/licenses'))    return 'licenses';
  if (pathname.includes('/subscriptions')) return 'subscriptions';
  if (pathname.includes('/invoices'))    return 'invoices';
  if (pathname.includes('/onboarding'))  return 'onboarding';
  if (pathname.includes('/company'))      return 'company';
  if (pathname.includes('/quotations'))  return 'quotations';
  if (pathname.includes('/support'))     return 'support';
  return 'dashboard';
}

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function statusPill(status: string) {
  if (status === 'PendingPayment') return <span className="status-pill status-amber">Chờ thanh toán</span>;
  if (status === 'Reconciling')    return <span className="status-pill status-blue">Đang đối soát</span>;
  if (status === 'Paid' || status === 'Active')   return <span className="status-pill status-green">Hoạt động</span>;
  if (status === 'Provisioned' || status === 'Completed') return <span className="status-pill status-green">Đã kích hoạt</span>;
  if (status === 'Cancelled')       return <span className="status-pill status-red">Đã hủy</span>;
  if (status === 'Pending')        return <span className="status-pill status-amber">Chờ duyệt</span>;
  if (status === 'Approved')       return <span className="status-pill status-blue">Đã duyệt</span>;
  if (status === 'Draft')         return <span className="status-pill">Nháp</span>;
  if (status === 'Issued' || status === 'Sent')  return <span className="status-pill status-blue">Đã gửi</span>;
  if (status === 'Accepted')       return <span className="status-pill status-green">Chấp nhận</span>;
  if (status === 'Rejected')       return <span className="status-pill status-red">Từ chối</span>;
  if (status === 'Trial')          return <span className="status-pill status-blue">Dùng thử</span>;
  if (status === 'Expired')        return <span className="status-pill status-amber">Hết hạn</span>;
  if (status === 'Suspended' || status === 'Locked') return <span className="status-pill status-red">Bị khóa</span>;
  return <span className="status-pill">{status}</span>;
}

function licenseStatusPill(status: string) {
  if (status === 'Active')       return <span className="status-pill status-green">Đang hoạt động</span>;
  if (status === 'Suspended' || status === 'Locked' || status === 'Revoked') return <span className="status-pill status-red">Đã khóa</span>;
  if (status === 'Expired')      return <span className="status-pill status-amber">Hết hạn</span>;
  if (status === 'Replaced')    return <span className="status-pill">Thay thế</span>;
  return <span className="status-pill">{status}</span>;
}

function customerStatusPill(status: string) {
  if (status === 'Trial')    return <span className="status-pill status-blue">Dùng thử</span>;
  if (status === 'Active' || status === 'Paid') return <span className="status-pill status-green">Đã trả phí</span>;
  if (status === 'Expired')  return <span className="status-pill status-amber">Hết hạn</span>;
  if (status === 'Suspended')return <span className="status-pill status-red">Bị khóa</span>;
  return <span className="status-pill">{status}</span>;
}

function priorityPill(priority: string) {
  const value = priority?.toLowerCase() || 'low';
  if (value === 'low')    return <span className="status-pill status-blue">Thấp</span>;
  if (value === 'medium' || value === 'normal') return <span className="status-pill status-amber">Trung bình</span>;
  if (value === 'high')   return <span className="status-pill status-red">Cao</span>;
  if (value === 'urgent' || value === 'critical') return <span className="status-pill status-red">Khẩn cấp</span>;
  return <span className="status-pill">{priority}</span>;
}

function ticketStatusPill(status: string) {
  if (status === 'Open')          return <span className="status-pill status-amber">Mới</span>;
  if (status === 'In Progress' || status === 'In-progress') return <span className="status-pill status-blue">Đang xử lý</span>;
  if (status === 'Resolved' || status === 'Closed') return <span className="status-pill status-green">Đã đóng</span>;
  if (status === 'WaitingCustomer') return <span className="status-pill status-amber">Chờ phản hồi</span>;
  return <span className="status-pill">{status}</span>;
}

function paymentStatusPill(status: string) {
  if (status === 'Confirmed')          return <span className="status-pill status-green">Đã xác nhận</span>;
  if (status === 'PendingReconciliation') return <span className="status-pill status-blue">Chờ đối soát</span>;
  if (status === 'Rejected')            return <span className="status-pill status-red">Từ chối</span>;
  return <span className="status-pill">{status}</span>;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '-';
}

function companyInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'AG';
}

export const BusinessOperations: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const activeView = getActiveView(location.pathname);
  const view = businessViews[activeView];
  const isPlatformAdmin = user?.role === 'PlatformAdmin';
  const isTenantOwner = user?.role === 'TenantOwner';
  const canUseCompanySettings = isTenantOwner || user?.role === 'SecurityAdmin';
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const pageTitle = activeView === 'orders' && isPlatformAdmin
    ? 'Tất cả đơn hàng'
    : activeView === 'orders' && isTenantOwner
      ? 'Đơn hàng của tôi'
      : view.title;
  const pageSubtitle = activeView === 'orders' && isPlatformAdmin
    ? 'Xem toàn bộ đơn hàng của mọi khách hàng trên nền tảng.'
    : activeView === 'orders' && isTenantOwner
      ? 'Theo dõi đơn hàng và trạng thái kích hoạt gói của doanh nghiệp bạn.'
      : view.subtitle;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dashboard, setDashboard] = useState<BusinessDashboardResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [licenses, setLicenses] = useState<LicenseResponse[]>([]);
  const [customers, setCustomers] = useState<TenantResponse[]>([]);
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [tenant, setTenant] = useState<TenantResponse | null>(null);
  const [settings, setSettings] = useState<TenantSettingsResponse | null>(null);
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionResponse[]>([]);
  const [quotations, setQuotations] = useState<QuotationResponse[]>([]);
  const [plans, setPlans] = useState<ProductPlanResponse[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeView === 'dashboard') {
        if (isPlatformAdmin) {
          setDashboard(await platformApi.getDashboard());
        } else {
          const [t, s, l, p] = await Promise.all([
            businessApi.getTenant(),
            businessApi.getSubscriptions(),
            businessApi.getLicenses(),
            businessApi.getPlans()
          ]);
          setTenant(t);
          setSubscriptions(s);
          setLicenses(l);
          setPlans(p);
        }
      } else if (activeView === 'customers') {
        const res = await platformApi.getTenants({ page: 1, pageSize: 100 });
        setCustomers(res.items);
      } else if (activeView === 'orders') {
        const res = isPlatformAdmin
          ? await platformApi.getOrders({ page: 1, pageSize: 200 })
          : await businessApi.getOrders({ page: 1, pageSize: 200 });
        setOrders(res.items);
      } else if (activeView === 'payments') {
        const res = isPlatformAdmin
          ? await platformApi.getPayments({ page: 1, pageSize: 200 })
          : await businessApi.getPayments({ page: 1, pageSize: 200 });
        setPayments(res.items);
      } else if (activeView === 'licenses') {
        const res = isPlatformAdmin
          ? await platformApi.getLicenses()
          : await businessApi.getLicenses();
        setLicenses(res);
      } else if (activeView === 'invoices') {
        const res = await platformApi.getInvoices({ page: 1, pageSize: 100 });
        setInvoices(res.items);
      } else if (activeView === 'support') {
        const res = isPlatformAdmin
          ? await platformApi.getTickets({ page: 1, pageSize: 100 })
          : await businessApi.getTickets({ page: 1, pageSize: 100 });
        setTickets(res.items);
      } else if (activeView === 'subscriptions') {
        const [subs, t, p] = await Promise.all([
          businessApi.getSubscriptions(),
          businessApi.getTenant(),
          businessApi.getPlans()
        ]);
        setSubscriptions(subs);
        setTenant(t);
        setPlans(p);
      } else if (activeView === 'quotations') {
        const [quo, p] = await Promise.all([
          businessApi.getQuotations({ page: 1, pageSize: 100 }),
          businessApi.getPlans()
        ]);
        setQuotations(quo.items);
        setPlans(p);
      } else if (activeView === 'company' && canUseCompanySettings) {
        const [t, s, c] = await Promise.all([
          businessApi.getTenant(),
          businessApi.getSettings(),
          businessApi.getContacts()
        ]);
        setTenant(t);
        setSettings(s);
        setContacts(c);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [activeView, isPlatformAdmin, canUseCompanySettings]);

  useEffect(() => { void loadData(); }, [loadData]);

  return (
    <div className="bizops-page">
      <div className="page-header bizops-header">
        <div>
          <h1>{pageTitle}</h1>
          <p className="subtitle">{pageSubtitle}</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={() => void loadData()}>
          <RefreshCw size={15} /> Làm mới
        </button>
      </div>

      {error && <div className="governance-alert error">{error}</div>}
      {message && <div className="governance-alert success">{message}</div>}
      {loading && <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>}

      {!loading && activeView === 'dashboard' && (
        isPlatformAdmin && dashboard
          ? <PlatformDashboardView dashboard={dashboard} />
          : <TenantOwnerDashboardView tenant={tenant} subscriptions={subscriptions} licenses={licenses} />
      )}
      {!loading && activeView === 'orders' && (
        <OrdersView orders={orders} isPlatformAdmin={isPlatformAdmin} onReload={loadData} />
      )}
      {!loading && activeView === 'payments' && (
        <PaymentsView payments={payments} isPlatformAdmin={isPlatformAdmin} />
      )}
      {!loading && activeView === 'licenses' && (
        <LicensesView licenses={licenses} isPlatformAdmin={isPlatformAdmin} onReload={loadData} />
      )}
      {!loading && activeView === 'customers' && (
        <CustomersView customers={customers} isPlatformAdmin={isPlatformAdmin} onReload={loadData} />
      )}
      {!loading && activeView === 'invoices' && (
        <InvoicesView invoices={invoices} isPlatformAdmin={isPlatformAdmin} onReload={loadData} />
      )}
      {!loading && activeView === 'subscriptions' && (
        <SubscriptionsView
          subscriptions={subscriptions} tenant={tenant} licenses={licenses}
          isTenantOwner={isTenantOwner} onReload={loadData}
        />
      )}
      {!loading && activeView === 'support' && (
        <SupportView tickets={tickets} isPlatformAdmin={isPlatformAdmin} onReload={loadData} />
      )}
      {!loading && activeView === 'onboarding' && (
        <OnboardingChecklistView />
      )}
      {!loading && activeView === 'company' && (
        canUseCompanySettings ? (
          <CompanySettingsView
            tenant={tenant} settings={settings} contacts={contacts}
            canEdit={isTenantOwner} onReload={loadData} onError={setError} onMessage={setMessage}
          />
        ) : (
          <div className="card glass p-8 text-center text-gray-400">
            PlatformAdmin vui lòng chọn một tenant trong CRM để cấu hình công ty.
          </div>
        )
      )}
      {!loading && activeView === 'quotations' && (
        <QuotationsView
          quotations={quotations} plans={plans}
          isTenantOwner={isTenantOwner} onReload={loadData} onError={setError} onMessage={setMessage}
        />
      )}
    </div>
  );
};

// ====== PLATFORM DASHBOARD ======
const PlatformDashboardView: React.FC<{ dashboard: BusinessDashboardResponse }> = ({ dashboard }) => {
  const total = dashboard.totalTenants || 1;
  const trialPct = Math.round((dashboard.trialTenants / total) * 100);
  const paidPct = Math.round((dashboard.paidTenants / total) * 100);
  const otherPct = Math.max(0, 100 - trialPct - paidPct);

  return (
    <div className="flex flex-col gap-6 platform-dashboard">
      {/* Summary metric cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 platform-metric-grid">
        <MetricCard icon={<Building2 />} label="Tổng khách hàng" value={String(dashboard.totalTenants)} tone="blue" />
        <MetricCard icon={<Users />} label="Đang Trial" value={String(dashboard.trialTenants)} tone="amber" />
        <MetricCard icon={<BadgeCheck />} label="Đã trả phí" value={String(dashboard.paidTenants)} tone="green" />
        <MetricCard icon={<DollarSign size={18} />} label="Doanh thu tháng" value={formatVnd(dashboard.recognizedRevenue)} tone="green" />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 platform-metric-grid">
        <MetricCard icon={<KeyRound />} label="License hoạt động" value={String(dashboard.activeSubscriptions)} tone="purple" />
        <MetricCard icon={<ClipboardList />} label="Đơn chờ duyệt" value={String(dashboard.pendingOrders)} tone="blue" />
        <MetricCard icon={<ReceiptText />} label="Thanh toán chờ" value={String(dashboard.pendingPayments)} tone="amber" />
        <MetricCard icon={<Headphones />} label="Ticket đang mở" value={String(dashboard.openTickets)} tone="red" />
      </section>

      {/* Distribution overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 platform-insight-grid">
        <div className="card glass p-5 platform-insight-card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Building2 size={14} /> Phân bổ Tenant
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400">Đã trả phí</span>
                <span className="text-gray-400">{dashboard.paidTenants} ({paidPct}%)</span>
              </div>
              <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${paidPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-400">Đang Trial</span>
                <span className="text-gray-400">{dashboard.trialTenants} ({trialPct}%)</span>
              </div>
              <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${trialPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Khác</span>
                <span className="text-gray-500">{otherPct}%</span>
              </div>
              <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gray-600 transition-all" style={{ width: `${otherPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card glass p-5 platform-insight-card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Shield size={14} /> Tổng quan hệ thống
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm platform-system-grid">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <KeyRound size={14} className="text-indigo-400" />
              </div>
              <div>
                <strong className="text-white text-lg">{dashboard.activeSubscriptions}</strong>
                <div className="text-xs text-gray-400">License Active</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <ClipboardList size={14} className="text-amber-400" />
              </div>
              <div>
                <strong className="text-white text-lg">{dashboard.pendingOrders}</strong>
                <div className="text-xs text-gray-400">Đơn chờ xử lý</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <ReceiptText size={14} className="text-blue-400" />
              </div>
              <div>
                <strong className="text-white text-lg">{dashboard.pendingPayments}</strong>
                <div className="text-xs text-gray-400">Thanh toán chờ</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Headphones size={14} className="text-red-400" />
              </div>
              <div>
                <strong className="text-white text-lg">{dashboard.openTickets}</strong>
                <div className="text-xs text-gray-400">Ticket mở</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 platform-quick-actions">
        <button className="card glass p-4 flex flex-col items-center gap-2 hover:bg-white/5 transition-colors text-center platform-quick-action" onClick={() => window.location.href = '/app/business/customers'}>
          <Building2 size={20} className="text-blue-400" />
          <span className="text-xs text-gray-300">Quản lý Khách hàng</span>
        </button>
        <button className="card glass p-4 flex flex-col items-center gap-2 hover:bg-white/5 transition-colors text-center platform-quick-action" onClick={() => window.location.href = '/app/business/orders'}>
          <ClipboardList size={20} className="text-indigo-400" />
          <span className="text-xs text-gray-300">Xử lý Đơn hàng</span>
        </button>
        <button className="card glass p-4 flex flex-col items-center gap-2 hover:bg-white/5 transition-colors text-center platform-quick-action" onClick={() => window.location.href = '/app/business/packages'}>
          <PackageCheck size={20} className="text-emerald-400" />
          <span className="text-xs text-gray-300">Quản lý Gói dịch vụ</span>
        </button>
        <button className="card glass p-4 flex flex-col items-center gap-2 hover:bg-white/5 transition-colors text-center platform-quick-action" onClick={() => window.location.href = '/app/business/support'}>
          <Headphones size={20} className="text-amber-400" />
          <span className="text-xs text-gray-300">Xem Ticket hỗ trợ</span>
        </button>
      </div>
    </div>
  );
};

// ====== TENANT OWNER DASHBOARD ======
const TenantOwnerDashboardView: React.FC<{
  tenant: TenantResponse | null;
  subscriptions: SubscriptionResponse[];
  licenses: LicenseResponse[];
}> = ({ tenant, subscriptions, licenses }) => {
  const navigate = useNavigate();
  const currentSub = subscriptions.find(s => s.status === 'Active' || s.status === 'Trial');
  const activeLicense = licenses.find(l => l.status === 'Active');
  const daysLeft = currentSub
    ? Math.max(0, Math.ceil((new Date(currentSub.currentPeriodEndsAt).getTime() - Date.now()) / 86400000))
    : 0;
  const isExpiringSoon = daysLeft <= 14 && daysLeft > 0;
  const isTrial = tenant?.status === 'Trial';
  const userPct = activeLicense ? (activeLicense.usedUsers / activeLicense.userLimit) * 100 : 0;
  const devicePct = activeLicense ? (activeLicense.usedDevices / activeLicense.deviceLimit) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Alert banner for trial */}
      {isTrial && (
        <div className="card glass p-5 border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
          <div>
            <strong className="text-amber-300 flex items-center gap-2"><AlertTriangle size={16} /> Trial đang hoạt động</strong>
            <p className="text-sm text-amber-200/70 mt-1">
              Hết hạn sau <strong>{daysLeft} ngày</strong> ({formatDate(tenant?.trialEndsAt ?? undefined)}).
              Mua gói để tiếp tục bảo vệ an toàn.
            </p>
          </div>
          <button className="btn-primary whitespace-nowrap" onClick={() => navigate('/app/business/packages')}>
            <DollarSign size={14} /> Mua gói ngay
          </button>
        </div>
      )}

      {/* Usage metrics */}
      {activeLicense && (
        <section className="grid grid-cols-3 gap-4">
          <div className="card glass p-5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <Users size={14} /> User đã dùng
            </div>
            <div className="flex items-end gap-2 mb-3">
              <strong className={`text-3xl ${userPct >= 90 ? 'text-red-400' : userPct >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {activeLicense.usedUsers}
              </strong>
              <span className="text-gray-400 text-sm mb-1">/ {activeLicense.userLimit}</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${userPct >= 90 ? 'bg-red-500' : userPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, userPct)}%` }} />
            </div>
          </div>
          <div className="card glass p-5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <Laptop size={14} /> Thiết bị đã dùng
            </div>
            <div className="flex items-end gap-2 mb-3">
              <strong className={`text-3xl ${devicePct >= 90 ? 'text-red-400' : devicePct >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {activeLicense.usedDevices}
              </strong>
              <span className="text-gray-400 text-sm mb-1">/ {activeLicense.deviceLimit}</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${devicePct >= 90 ? 'bg-red-500' : devicePct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, devicePct)}%` }} />
            </div>
          </div>
          <div className="card glass p-5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <Shield size={14} /> Thời gian còn lại
            </div>
            <div className="flex items-end gap-2 mb-3">
              <strong className={`text-3xl ${isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'}`}>
                {daysLeft}
              </strong>
              <span className="text-gray-400 text-sm mb-1">ngày</span>
            </div>
            <div className="text-xs text-gray-400">
              {currentSub ? `Hết hạn: ${new Date(currentSub.currentPeriodEndsAt).toLocaleDateString('vi-VN')}` : 'Không có subscription'}
            </div>
          </div>
        </section>
      )}

      {/* Tenant info card */}
      <section className="grid grid-cols-2 gap-4">
        <div className="card glass p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              {companyInitials(tenant?.companyName ?? 'AG')}
            </div>
            <div>
              <strong className="text-white">{tenant?.companyName ?? '-'}</strong>
              <div className="text-xs text-gray-400">{tenant?.code} · {currentSub?.planName || 'Chưa có gói'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-400">Trạng thái:</span> {statusPill(tenant?.status ?? '')}</div>
            <div><span className="text-gray-400">Chu kỳ:</span> <strong>{currentSub?.billingCycle ?? '-'}</strong></div>
            <div><span className="text-gray-400">Auto-renew:</span> <strong>{currentSub?.autoRenew ? 'Bật' : 'Tắt'}</strong></div>
            <div><span className="text-gray-400">Gói:</span> <strong>{currentSub?.status ?? '-'}</strong></div>
          </div>
        </div>

        <div className="card glass p-5">
          <h3 className="font-semibold text-sm text-gray-400 mb-4">Thao tác nhanh</h3>
          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary text-sm" onClick={() => navigate('/app/business/packages')}>
              <PackageCheck size={14} /> Mua gói
            </button>
            <button className="btn-secondary text-sm" onClick={() => navigate('/app/business/onboarding')}>
              <CheckSquare size={14} /> Checklist
            </button>
            <button className="btn-secondary text-sm" onClick={() => navigate('/app/business/quotations')}>
              <FileText size={14} /> Báo giá
            </button>
            <button className="btn-secondary text-sm" onClick={() => navigate('/app/business/company')}>
              <Settings size={14} /> Cấu hình
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: string }> =
  ({ icon, label, value, tone }) => (
    <div className={`bizops-metric card glass platform-metric-card ${tone}`}>
      <span>{icon}</span>
      <div><strong>{value}</strong><small>{label}</small></div>
    </div>
  );

// ====== ORDERS ======
const OrdersView: React.FC<{
  orders: OrderResponse[];
  isPlatformAdmin: boolean;
  onReload: () => void;
}> = ({ orders, isPlatformAdmin, onReload }) => {
  const navigate = useNavigate();

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
  const handlePay = (order: OrderResponse) => {
    navigate('/app/business/payment', { state: { order, purchaseMonths: order.billingCycle === 'Yearly' ? 12 : 1 } });
  };
  const isTerminal = (s: string) => s === 'Cancelled' || s === 'Provisioned' || s === 'Completed';

  return (
    <section className="card glass bizops-panel">
      <div className="bizops-panel-title">
        <div><ClipboardList size={18} /><h2>{isPlatformAdmin ? 'Toàn bộ đơn hàng' : 'Đơn hàng của doanh nghiệp'}</h2></div>
      </div>
      <div className="bizops-table-wrap">
        <table className="bizops-table">
          <thead><tr>
            <th>Mã đơn</th>
            {isPlatformAdmin && <th>Khách hàng</th>}
            <th>Gói</th><th>User / Device</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th>
          </tr></thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td><strong>{order.orderNumber}</strong><br /><small>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</small></td>
                {isPlatformAdmin && <td>{order.companyName}<br /><small>{order.tenantCode}</small></td>}
                <td>{order.planName} ({order.billingCycle})</td>
                <td>{order.userQuantity} / {order.deviceQuantity}</td>
                <td>{formatVnd(order.totalAmount)}</td>
                <td>{statusPill(order.status)}</td>
                <td>
                  <div className="bizops-actions">
                    {!isPlatformAdmin && (order.status === 'PendingPayment' || order.status === 'Pending') && (
                      <button className="btn-primary" onClick={() => handlePay(order)}>Thanh toán</button>
                    )}
                    {isPlatformAdmin && !isTerminal(order.status) && (
                      <button className="btn-primary" onClick={() => handlePay(order)}>Duyệt & cấp gói</button>
                    )}
                    {isPlatformAdmin && (order.status === 'Paid' || order.status === 'Reconciling') && (
                      <button onClick={() => handleProvision(order.id)}>Cấp License</button>
                    )}
                    {isPlatformAdmin && !isTerminal(order.status) && (
                      <button className="danger" onClick={() => handleCancel(order.id)}>Hủy</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={isPlatformAdmin ? 7 : 6} className="text-center p-4">Không có đơn hàng nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
};

// ====== PAYMENTS ======
const PaymentsView: React.FC<{ payments: PaymentResponse[]; isPlatformAdmin: boolean }> =
  ({ payments, isPlatformAdmin }) => {
    const confirmed = payments.filter(p => p.status === 'Confirmed');
    const pending = payments.filter(p => p.status !== 'Confirmed');
    const totalConfirmed = confirmed.reduce((s, p) => s + p.amount, 0);
    const totalPending = pending.reduce((s, p) => s + p.amount, 0);

    return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card glass p-4 text-center">
          <div className="text-xs text-gray-400 mb-1">Đã xác nhận</div>
          <strong className="text-xl text-emerald-400">{formatVnd(totalConfirmed)}</strong>
          <div className="text-xs text-gray-500 mt-1">{confirmed.length} giao dịch</div>
        </div>
        <div className="card glass p-4 text-center">
          <div className="text-xs text-gray-400 mb-1">Chờ xử lý</div>
          <strong className="text-xl text-amber-400">{formatVnd(totalPending)}</strong>
          <div className="text-xs text-gray-500 mt-1">{pending.length} giao dịch</div>
        </div>
        <div className="card glass p-4 text-center">
          <div className="text-xs text-gray-400 mb-1">Tổng cộng</div>
          <strong className="text-xl text-white">{formatVnd(totalConfirmed + totalPending)}</strong>
          <div className="text-xs text-gray-500 mt-1">{payments.length} giao dịch</div>
        </div>
      </div>
      <section className="card glass bizops-panel">
        <div className="bizops-panel-title">
          <div><ReceiptText size={18} /><h2>{isPlatformAdmin ? 'Toàn bộ giao dịch' : 'Giao dịch của doanh nghiệp'}</h2></div>
        </div>
        <div className="bizops-table-wrap">
          <table className="bizops-table">
            <thead><tr>
              <th>Mã thanh toán</th><th>Mã đơn</th>
              {isPlatformAdmin && <th>Tenant</th>}
              <th>Số tiền</th><th>Phương thức</th><th>Trạng thái</th><th>Thời gian</th>
            </tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.paymentNumber}</strong></td>
                  <td>{p.orderNumber}</td>
                  {isPlatformAdmin && <td>{p.tenantCode || p.tenantId.slice(0, 8)}</td>}
                  <td className="text-emerald-300">{formatVnd(p.amount)}</td>
                  <td>{p.method}</td>
                  <td>{paymentStatusPill(p.status)}</td>
                  <td>{new Date(p.reconciledAt || p.createdAt).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={isPlatformAdmin ? 7 : 6} className="text-center p-4">Chưa có giao dịch.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// ====== LICENSES ======
const LicensesView: React.FC<{ licenses: LicenseResponse[]; isPlatformAdmin: boolean; onReload: () => void }> =
  ({ licenses, isPlatformAdmin, onReload }) => {
    const active = licenses.filter(l => l.status === 'Active');
    const suspended = licenses.filter(l => l.status === 'Suspended');
    const totalUsers = active.reduce((s, l) => s + l.userLimit, 0);
    const usedUsers = active.reduce((s, l) => s + l.usedUsers, 0);
    const totalDevices = active.reduce((s, l) => s + l.deviceLimit, 0);
    const usedDevices = active.reduce((s, l) => s + l.usedDevices, 0);
    const toggleLock = async (id: string, current: string) => {
      await platformApi.updateLicenseStatus(id, current === 'Active' ? 'Suspended' : 'Active');
      await onReload();
    };
    const handleRenew = async (id: string) => {
      if (!confirm('Gia hạn license này thêm 12 tháng?')) return;
      await platformApi.renewLicense(id, { months: 12 });
      await onReload();
    };

    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card glass p-4 text-center">
            <div className="text-xs text-gray-400 mb-1">Tổng License</div>
            <strong className="text-2xl text-indigo-400">{licenses.length}</strong>
            <div className="text-xs text-gray-500 mt-1">{active.length} active</div>
          </div>
          <div className="card glass p-4 text-center">
            <div className="text-xs text-gray-400 mb-1">Tổng User Limit</div>
            <strong className="text-2xl text-emerald-400">{totalUsers}</strong>
            <div className="text-xs text-gray-500 mt-1">{usedUsers} đã dùng</div>
          </div>
          <div className="card glass p-4 text-center">
            <div className="text-xs text-gray-400 mb-1">Tổng Device Limit</div>
            <strong className="text-2xl text-blue-400">{totalDevices}</strong>
            <div className="text-xs text-gray-500 mt-1">{usedDevices} đã dùng</div>
          </div>
          <div className="card glass p-4 text-center">
            <div className="text-xs text-gray-400 mb-1">Bị khóa</div>
            <strong className="text-2xl text-red-400">{suspended.length}</strong>
            <div className="text-xs text-gray-500 mt-1">License bị treo</div>
          </div>
        </div>
      <section className="card glass bizops-panel">
        <div className="bizops-panel-title">
          <div><KeyRound size={18} /><h2>Quản lý License</h2></div>
        </div>
        <div className="bizops-table-wrap">
          <table className="bizops-table">
            <thead><tr>
              <th>Tenant</th><th>Gói</th><th>Ngày bắt đầu</th><th>Ngày hết hạn</th>
              <th>User / Device</th><th>Trạng thái</th>
              {isPlatformAdmin && <th>Thao tác</th>}
            </tr></thead>
            <tbody>
              {licenses.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.tenantCode}</strong></td>
                  <td>{l.planName}</td>
                  <td>{new Date(l.startsAt).toLocaleDateString('vi-VN')}</td>
                  <td>{new Date(l.expiresAt).toLocaleDateString('vi-VN')}</td>
                  <td>{l.usedUsers}/{l.userLimit} user<br />{l.usedDevices}/{l.deviceLimit} thiết bị</td>
                  <td>{licenseStatusPill(l.status)}</td>
                  {isPlatformAdmin && (
                    <td>
                      <div className="bizops-actions">
                        <button onClick={() => toggleLock(l.id, l.status)}>{l.status === 'Active' ? 'Khóa' : 'Mở khóa'}</button>
                        <button onClick={() => handleRenew(l.id)}>Gia hạn</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {licenses.length === 0 && <tr><td colSpan={isPlatformAdmin ? 7 : 6} className="text-center p-4">Không có license nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    );
  };

// ====== CUSTOMERS ======
const CustomersView: React.FC<{ customers: TenantResponse[]; isPlatformAdmin: boolean; onReload: () => void }> =
  ({ customers, isPlatformAdmin, onReload }) => {
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
      if (!newCompany || !newEmail || !newName || !newDomain) { alert('Vui lòng điền đủ thông tin'); return; }
      await platformApi.createTrialTenant({
        code: newDomain.split('.')[0].toLowerCase(),
        companyName: newCompany, emailDomain: newDomain,
        ownerName: newName, ownerEmail: newEmail, ownerPassword: 'TrialPassword@123'
      });
      setShowAdd(false);
      await onReload();
    };

    return (
      <section className="card glass bizops-panel">
        <div className="bizops-panel-title">
          <div><Building2 size={18} /><h2>Khách hàng / Tenant CRM</h2></div>
          {isPlatformAdmin && (
            <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}><Plus size={14} /> Thêm Trial</button>
          )}
        </div>
        {showAdd && (
          <div className="bizops-inline-form tenant-trial-form">
            <h3>Thêm khách hàng dùng thử</h3>
            <div className="bizops-form-grid">
              <input type="text" placeholder="Tên công ty" value={newCompany} onChange={e => setNewCompany(e.target.value)} />
              <input type="text" placeholder="Domain công ty" value={newDomain} onChange={e => setNewDomain(e.target.value)} />
              <input type="text" placeholder="Tên admin" value={newName} onChange={e => setNewName(e.target.value)} />
              <input type="email" placeholder="Email admin" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <div className="bizops-actions tenant-trial-actions">
              <button className="btn-primary tenant-trial-submit" onClick={handleAddTrial}>Tạo Trial</button>
              <button className="btn-secondary tenant-trial-cancel" onClick={() => setShowAdd(false)}>Hủy</button>
            </div>
          </div>
        )}
        <div className="bizops-crm-grid">
          {customers.map(c => (
            <div className="bizops-crm-card" key={c.id}>
              <div className="crm-head">
                <div><strong>{c.companyName} ({c.code})</strong><span>{c.ownerName}</span></div>
                {customerStatusPill(c.status || 'Active')}
              </div>
              <p>{c.ownerEmail}</p>
              <p>{c.ownerPhone}</p>
              <div className="crm-plan">{c.currentPlan || 'Không có gói'}</div>
              <small>Users: {c.activeUsers} | Devices: {c.activeDevices}</small>
              {isPlatformAdmin && (
                <>
                  <button className="btn-secondary w-full mt-4" onClick={() => handleStatusChange(c.id, c.status || 'Active')}>
                    {c.status === 'Active' ? 'Khóa Tenant' : 'Mở khóa Tenant'}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

// ====== INVOICES ======
const InvoicesView: React.FC<{ invoices: InvoiceResponse[]; isPlatformAdmin: boolean; onReload: () => void }> =
  ({ invoices, isPlatformAdmin, onReload }) => {
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
            <thead><tr>
              <th>Mã hóa đơn</th>{isPlatformAdmin && <th>Khách hàng</th>}
              <th>Số tiền</th><th>Ngày lập</th><th>Hạn chót</th><th>Trạng thái</th><th>Thao tác</th>
            </tr></thead>
            <tbody>
              {invoices.map(i => (
                <tr key={i.id}>
                  <td><strong>{i.invoiceNumber}</strong></td>
                  {isPlatformAdmin && <td>{i.companyName}</td>}
                  <td>{formatVnd(i.totalAmount)}</td>
                  <td>{new Date(i.issuedAt).toLocaleDateString('vi-VN')}</td>
                  <td>{new Date(i.dueAt).toLocaleDateString('vi-VN')}</td>
                  <td>{statusPill(i.status)}</td>
                  <td>
                    {isPlatformAdmin && i.status !== 'Paid' && (
                      <button onClick={() => markAsPaid(i.id)}>Đánh dấu đã thanh toán</button>
                    )}
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

// ====== SUBSCRIPTIONS ======
const SubscriptionsView: React.FC<{
  subscriptions: SubscriptionResponse[];
  tenant: TenantResponse | null;
  licenses: LicenseResponse[];
  isTenantOwner: boolean;
  onReload: () => void;
}> = ({ subscriptions, tenant, licenses, isTenantOwner }) => {
  const navigate = useNavigate();
  const currentSub = subscriptions.find(s => s.status === 'Active' || s.status === 'Trial');
  const daysLeft = currentSub ? Math.max(0, Math.ceil((new Date(currentSub.currentPeriodEndsAt).getTime() - Date.now()) / 86400000)) : 0;
  const isExpiring = daysLeft <= 14;
  const activeLicenses = licenses.filter(l => l.status === 'Active');
  const currentLicense = activeLicenses[0];

  return (
    <div className="flex flex-col gap-6">
      {tenant?.status === 'Trial' && (
        <div className="card glass p-4 border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
          <div>
            <strong className="text-amber-300">Trial đang hoạt động</strong>
            <p className="text-sm text-amber-200/70 mt-1">
              Hết hạn sau <strong>{daysLeft} ngày</strong> ({new Date(tenant.trialEndsAt ?? '').toLocaleDateString('vi-VN')}).
            </p>
          </div>
          <button className="btn-primary whitespace-nowrap" onClick={() => navigate('/app/business/packages')}>
            <DollarSign size={14} /> Mua gói ngay
          </button>
        </div>
      )}
      {currentLicense && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card glass p-5">
            <div className="text-xs text-gray-400 mb-1">User đã dùng</div>
            <div className="flex items-end gap-2 mb-2">
              <strong className="text-2xl">{currentLicense.usedUsers}</strong>
              <span className="text-gray-400 text-sm">/ {currentLicense.userLimit}</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${currentLicense.usedUsers / currentLicense.userLimit >= 0.9 ? 'bg-red-500' : currentLicense.usedUsers / currentLicense.userLimit >= 0.7 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (currentLicense.usedUsers / currentLicense.userLimit) * 100)}%` }} />
            </div>
          </div>
          <div className="card glass p-5">
            <div className="text-xs text-gray-400 mb-1">Thiết bị đã dùng</div>
            <div className="flex items-end gap-2 mb-2">
              <strong className="text-2xl">{currentLicense.usedDevices}</strong>
              <span className="text-gray-400 text-sm">/ {currentLicense.deviceLimit}</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${currentLicense.usedDevices / currentLicense.deviceLimit >= 0.9 ? 'bg-red-500' : currentLicense.usedDevices / currentLicense.deviceLimit >= 0.7 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (currentLicense.usedDevices / currentLicense.deviceLimit) * 100)}%` }} />
            </div>
          </div>
          <div className="card glass p-5">
            <div className="text-xs text-gray-400 mb-1">Ngày còn lại</div>
            <div className="flex items-end gap-2">
              <strong className={`text-2xl ${isExpiring ? 'text-amber-300' : 'text-emerald-400'}`}>{daysLeft}</strong>
              <span className="text-gray-400 text-sm">ngày</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Hết hạn: {currentSub ? new Date(currentSub.currentPeriodEndsAt).toLocaleDateString('vi-VN') : '-'}
            </div>
          </div>
        </div>
      )}
      <section className="card glass bizops-panel">
        <div className="bizops-panel-title">
          <div><BadgeCheck size={18} /><h2>Chi tiết Subscription</h2></div>
          {isTenantOwner && (
            <button className="btn-secondary" onClick={() => navigate('/app/business/packages')}>
              Nâng cấp / Gia hạn
            </button>
          )}
        </div>
        {subscriptions.length === 0 ? (
          <div className="p-6 text-center text-gray-400">Chưa có subscription.</div>
        ) : (
          <div className="bizops-table-wrap">
            <table className="bizops-table">
              <thead><tr>
                <th>Gói</th><th>Trạng thái</th><th>Chu kỳ</th><th>User / Device</th><th>Tự động gia hạn</th><th>Bắt đầu</th><th>Hết hạn</th>
              </tr></thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id}>
                    <td><strong>{sub.planName}</strong></td>
                    <td>{statusPill(sub.status)}</td>
                    <td>{sub.billingCycle}</td>
                    <td>{sub.userLimit} user / {sub.deviceLimit} device</td>
                    <td>{sub.autoRenew ? <BadgeCheck className="text-emerald-400" size={16} /> : '-'}</td>
                    <td>{new Date(sub.startsAt).toLocaleDateString('vi-VN')}</td>
                    <td className={daysLeft <= 14 ? 'text-amber-300' : ''}>
                      {new Date(sub.currentPeriodEndsAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

// ====== SUPPORT ======
const SupportView: React.FC<{ tickets: TicketResponse[]; isPlatformAdmin: boolean; onReload: () => void }> =
  ({ tickets, isPlatformAdmin, onReload }) => {
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
            <thead><tr>
              <th>Mã Ticket</th><th>Tiêu đề</th><th>Độ ưu tiên</th><th>Trạng thái</th><th>Ngày tạo</th>
              {isPlatformAdmin && <th>Thao tác</th>}
            </tr></thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.ticketNumber}</strong></td>
                  <td>{t.subject}</td>
                  <td>{priorityPill(t.priority)}</td>
                  <td>{ticketStatusPill(t.status)}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString('vi-VN')}</td>
                  {isPlatformAdmin && (
                    <td>
                      <div className="bizops-actions">
                        {t.status === 'Open' && <button onClick={() => updateStatus(t.id, 'In Progress')}>Xử lý</button>}
                        {t.status !== 'Resolved' && <button onClick={() => updateStatus(t.id, 'Resolved')}>Đóng</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {tickets.length === 0 && <tr><td colSpan={6} className="text-center p-4">Không có ticket nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

// ====== ONBOARDING CHECKLIST ======
const OnboardingChecklistView: React.FC = () => {
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === 'PlatformAdmin';
  const [onboardingList, setOnboardingList] = useState<OnboardingResponse[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [onboarding, setOnboarding] = useState<OnboardingResponse | null>(null);
  const [tokenInfo, setTokenInfo] = useState<EnrollmentTokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [firstUserAdded, setFirstUserAdded] = useState(false);
  const [policyEnabled, setPolicyEnabled] = useState(false);
  const [testPromptCompleted, setTestPromptCompleted] = useState(false);
  const [notes, setNotes] = useState('');

  const loadOnboarding = useCallback(async () => {
    setLoading(true);
    setError('');
    setMessage('');
    setTokenInfo(null);
    try {
      if (isPlatformAdmin) {
        const data = await businessApi.getOnboarding();
        const list = (data as OnboardingListResponse).items || [];
        setOnboardingList(list);
        if (list.length > 0) {
          const first = selectedTenant ? list.find(o => o.tenantId === selectedTenant) || list[0] : list[0];
          setSelectedTenant(first.tenantId);
          setOnboarding(first);
          setExtensionInstalled(first.extensionInstalled);
          setFirstUserAdded(first.firstUserAdded);
          setPolicyEnabled(first.policyEnabled);
          setTestPromptCompleted(first.testPromptCompleted);
          setNotes(first.notes || '');
        } else {
          setOnboarding(null);
        }
      } else {
        const data = await businessApi.getOnboarding() as OnboardingResponse;
        setOnboarding(data);
        setExtensionInstalled(data.extensionInstalled);
        setFirstUserAdded(data.firstUserAdded);
        setPolicyEnabled(data.policyEnabled);
        setTestPromptCompleted(data.testPromptCompleted);
        setNotes(data.notes || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin onboarding.');
      setOnboarding(null);
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin, selectedTenant]);

  useEffect(() => { void loadOnboarding(); }, [loadOnboarding]);

  const handleSaveOnboarding = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      let updated: OnboardingResponse;
      if (isPlatformAdmin && selectedTenant) {
        updated = await platformApi.updateOnboarding(selectedTenant, { extensionInstalled, firstUserAdded, policyEnabled, testPromptCompleted, notes });
        await loadOnboarding();
      } else {
        updated = await businessApi.updateOnboarding({ extensionInstalled, firstUserAdded, policyEnabled, testPromptCompleted, notes }) as OnboardingResponse;
        setOnboarding(updated);
      }
      setMessage('Đã cập nhật checklist thành công.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật checklist.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Bạn có chắc chắn muốn cấp mới Enrollment Token? Token cũ sẽ mất hiệu lực.')) return;
    setGeneratingToken(true);
    setError('');
    setMessage('');
    try {
      const res = isPlatformAdmin && selectedTenant
        ? await platformApi.regenerateEnrollmentToken(selectedTenant)
        : await businessApi.regenerateEnrollmentToken();
      setTokenInfo(res);
      setMessage('Đã cấp mới Enrollment Token thành công.');
      await loadOnboarding();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cấp mới Enrollment Token.');
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const calculateProgress = () => {
    if (!onboarding) return 0;
    const steps = [onboarding.adminCreated, onboarding.enrollmentTokenCreated,
      onboarding.extensionInstalled, onboarding.firstUserAdded,
      onboarding.policyEnabled, onboarding.testPromptCompleted];
    return Math.round((steps.filter(Boolean).length / steps.length) * 100);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      <div className="text-gray-400">Đang tải thông tin onboarding...</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      {error && <div className="governance-alert error">{error}</div>}
      {message && <div className="governance-alert success">{message}</div>}

      {isPlatformAdmin && onboardingList.length > 0 && (
        <div className="card glass p-4 flex items-center gap-4 onboarding-tenant-selector">
          <span className="text-sm text-gray-400">Tenant:</span>
          <select
            className="select-dark"
            value={selectedTenant}
            onChange={e => setSelectedTenant(e.target.value)}
          >
            {onboardingList.map(o => (
              <option key={o.tenantId} value={o.tenantId}>{o.tenantCode.toUpperCase()} — {o.status}</option>
            ))}
          </select>
        </div>
      )}

      {!onboarding && !isPlatformAdmin && (
        <div className="card glass p-8 text-center flex flex-col items-center gap-4 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <CheckSquare size={28} className="text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Chào mừng bạn đến với AIGuard!</h3>
          <p className="text-gray-400 max-w-md">
            Tenant của bạn đã được tạo thành công. Hãy thực hiện theo checklist bên dưới để hoàn tất thiết lập ban đầu và bảo vệ doanh nghiệp của bạn.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full mt-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-left">
              <div className="text-xs text-gray-400 mb-1">Bước 1</div>
              <div className="text-sm font-semibold text-white">Cài Extension</div>
              <div className="text-xs text-gray-500 mt-1">Cài AIGuard DLP lên trình duyệt</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-left">
              <div className="text-xs text-gray-400 mb-1">Bước 2</div>
              <div className="text-sm font-semibold text-white">Thêm User</div>
              <div className="text-xs text-gray-500 mt-1">Mời nhân viên/phòng ban</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-left">
              <div className="text-xs text-gray-400 mb-1">Bước 3</div>
              <div className="text-sm font-semibold text-white">Kích hoạt Policy</div>
              <div className="text-xs text-gray-500 mt-1">Thiết lập Whitelist/Blacklist DLP</div>
            </div>
          </div>
          <button className="btn-primary mt-2" onClick={() => void loadOnboarding()}>
            <RefreshCw size={14} /> Tải lại
          </button>
        </div>
      )}

      {!onboarding && isPlatformAdmin && onboardingList.length === 0 && (
        <div className="card glass p-8 text-center flex flex-col items-center gap-3 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle size={28} className="text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Chưa có tenant nào hoàn tất onboarding</h3>
          <p className="text-gray-400 max-w-md">
            Khi có tenant đăng ký mới, checklist onboarding sẽ xuất hiện tại đây.
          </p>
        </div>
      )}

      {onboarding && (
        <div className="company-settings-grid onboarding-workspace-grid">
          {/* Checklist */}
          <section className="card glass bizops-panel onboarding-checklist-card">
            <div className="bizops-panel-title">
              <div><CheckSquare size={18} /><h2>Checklist Triển khai: {onboarding.tenantCode.toUpperCase()}</h2></div>
              <div>
                {onboarding.status === 'Completed'
                  ? <span className="status-pill status-green">Hoàn thành</span>
                  : <span className="status-pill status-blue">Đang thực hiện</span>}
              </div>
            </div>

            <div className="onboarding-progress-card">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-400">TIẾN ĐỘ THIẾT LẬP</span>
                <span className="text-xs font-bold text-indigo-400">{calculateProgress()}%</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${calculateProgress()}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
              </div>
            </div>

            <div className="flex flex-col gap-4 onboarding-step-list">
              {[
                { done: onboarding.adminCreated, label: '1. Tạo tài khoản Tenant Admin', detail: 'Tài khoản quản trị ban đầu đã khởi tạo khi đăng ký.' },
                { done: onboarding.enrollmentTokenCreated, label: '2. Cấp Enrollment Token', detail: 'Cấp mã token xác thực thiết bị Agent.', button: true },
                { done: onboarding.extensionInstalled, label: '3. Cài đặt Browser Extension', detail: 'Cài extension AIGuard DLP lên trình duyệt máy trạm.', checkbox: true, checked: extensionInstalled, onChange: setExtensionInstalled },
                { done: onboarding.firstUserAdded, label: '4. Thêm User đầu tiên', detail: 'Thêm nhân viên hoặc phòng ban trong Quản trị doanh nghiệp.', checkbox: true, checked: firstUserAdded, onChange: setFirstUserAdded },
                { done: onboarding.policyEnabled, label: '5. Kích hoạt chính sách bảo mật', detail: 'Thiết lập Policy Rule Builder hoặc Whitelist/Blacklist DLP.', checkbox: true, checked: policyEnabled, onChange: setPolicyEnabled },
                { done: onboarding.testPromptCompleted, label: '6. Gửi Prompt chạy thử', detail: 'Gửi prompt chứa dữ liệu nhạy cảm giả lập để kiểm tra hoạt động chặn.', checkbox: true, checked: testPromptCompleted, onChange: setTestPromptCompleted },
              ].map((step, i) => (
                <div key={i} className={`onboarding-step-row ${step.done ? 'is-done' : 'is-pending'}`}>
                  <div className="onboarding-step-icon">
                    {step.done
                      ? <BadgeCheck className="text-emerald-400" size={18} />
                      : step.checkbox
                        ? <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600 cursor-pointer"
                            checked={step.checked} onChange={e => step.onChange?.(e.target.checked)} />
                        : <div className="w-4 h-4 rounded-full border border-gray-500 flex items-center justify-center text-[10px] text-gray-400 font-bold">{i + 1}</div>}
                  </div>
                  <div className="onboarding-step-copy">
                    <strong className="block text-sm text-gray-200">{step.label}</strong>
                    <span className="text-xs text-gray-400">{step.detail}</span>
                  </div>
                  {step.button && (
                    <button className="btn-secondary text-xs px-2.5 py-1 min-h-[30px] onboarding-token-button" onClick={handleRegenerateToken} disabled={generatingToken}>
                      {generatingToken ? 'Đang tạo...' : onboarding.enrollmentTokenCreated ? 'Cấp lại Token' : 'Tạo Token'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="mt-6 pt-4 border-t border-white/10 onboarding-notes">
              <label className="block text-xs font-semibold text-gray-400 mb-2">Ghi chú triển khai:</label>
              <textarea className="w-full bg-black/30 border border-white/10 text-white rounded-lg p-3 text-sm min-h-[90px] outline-none focus:border-indigo-500/50 onboarding-notes-input"
                value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nhập ghi chú triển khai riêng..." />
            </div>

            <div className="mt-6 flex justify-end">
              <button className="btn-primary flex items-center gap-2" onClick={handleSaveOnboarding} disabled={saving}>
                <Save size={14} />{saving ? 'Đang lưu...' : 'Lưu Checklist'}
              </button>
            </div>
          </section>

          {/* Guide */}
          <section className="flex flex-col gap-6 onboarding-side-panel">
            {tokenInfo && (
              <div className="card glass p-6 border-indigo-500/30 onboarding-token-card" style={{ background: 'rgba(99,102,241,0.05)' }}>
                <h3 className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-2">
                  <Terminal size={16} />Thông tin Token kích hoạt vừa cấp
                </h3>
                <div className="token-box mb-4">
                  <div>
                    <span>Mã Token Enrollment</span>
                    <code>{tokenInfo.enrollmentToken}</code>
                  </div>
                  <button className="btn-secondary p-2 min-h-[36px] flex items-center justify-center"
                    onClick={() => handleCopy(tokenInfo.enrollmentToken)}>
                    <Copy size={14} className={copied ? 'text-green-400' : 'text-gray-400'} />
                  </button>
                </div>
                <div className="token-box mb-4">
                  <div>
                    <span>Lệnh PowerShell cài đặt Agent</span>
                    <code style={{ fontSize: '11px' }}>{tokenInfo.installCommand}</code>
                  </div>
                  <button className="btn-secondary p-2 min-h-[36px] flex items-center justify-center"
                    onClick={() => handleCopy(tokenInfo.installCommand)}>
                    <Copy size={14} />
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  Hạn: <strong className="text-gray-300">{new Date(tokenInfo.expiresAt).toLocaleString('vi-VN')}</strong>
                </div>
              </div>
            )}

            <div className="onboarding-guide">
              <strong>Hướng dẫn triển khai AIGuard</strong>
              <ol>
                <li>Nhấn <strong>Tạo Token</strong> ở checklist bước 2 để lấy mã Token kích hoạt thiết bị.</li>
                <li>Sao chép <strong>Lệnh PowerShell cài đặt Agent</strong>. Mở PowerShell Administrator trên máy trạm và chạy lệnh để tự động cài AIGuard Agent & Extension.</li>
                <li>Sau khi cài, đảm bảo tiện ích AIGuard đã được bật trên trình duyệt.</li>
                <li>Thêm nhân viên trong <strong>Người dùng & phòng ban</strong> của Quản trị doanh nghiệp.</li>
                <li>Định hình quy tắc bảo mật DLP qua <strong>Policy Rule Builder</strong>.</li>
                <li>Gửi thử prompt chứa dữ liệu nhạy cảm trên ChatGPT/Claude. Hệ thống sẽ chặn và ghi nhận sự cố.</li>
              </ol>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

// ====== COMPANY SETTINGS ======
const defaultSettingsForm: TenantSettingsRequest = {
  logoUrl: '', primaryDomain: '', defaultRetentionDays: 365,
  timeZone: 'Asia/Ho_Chi_Minh', locale: 'vi-VN',
  bankCode: '', bankAccountNumber: '', bankAccountName: '',
  paymentWebhookUrl: '', billingAddress: ''
};
const blankContactForm: ContactRequest = {
  fullName: '', email: '', phone: '', jobTitle: '',
  isPrimary: false, isBillingContact: false
};
function settingsToForm(s: TenantSettingsResponse | null): TenantSettingsRequest {
  if (!s) return defaultSettingsForm;
  return {
    logoUrl: s.logoUrl ?? '', primaryDomain: s.primaryDomain ?? '',
    defaultRetentionDays: s.defaultRetentionDays,
    timeZone: s.timeZone || 'Asia/Ho_Chi_Minh', locale: s.locale || 'vi-VN',
    bankCode: s.bankCode ?? '', bankAccountNumber: s.bankAccountNumber ?? '',
    bankAccountName: s.bankAccountName ?? '',
    paymentWebhookUrl: s.paymentWebhookUrl ?? '', billingAddress: s.billingAddress ?? ''
  };
}

const CompanySettingsView: React.FC<{
  tenant: TenantResponse | null;
  settings: TenantSettingsResponse | null;
  contacts: ContactResponse[];
  canEdit: boolean;
  onReload: () => void;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}> = ({ tenant, settings, contacts, canEdit, onReload, onError, onMessage }) => {
  const [form, setForm] = useState<TenantSettingsRequest>(() => settingsToForm(settings));
  const [contactForm, setContactForm] = useState<ContactRequest>(blankContactForm);
  const [saving, setSaving] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactResponse | null>(null);

  useEffect(() => { setForm(settingsToForm(settings)); }, [settings]);

  if (!tenant || !settings) {
    return <div className="card glass p-8 text-center text-gray-400">Không tải được hồ sơ tenant.</div>;
  }

  const setField = <K extends keyof TenantSettingsRequest>(key: K, value: TenantSettingsRequest[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const reportError = (caught: unknown, fallback: string) => {
    onMessage(''); onError(caught instanceof Error ? caught.message : fallback);
  };

  const handleSaveSettings = async () => {
    if (!canEdit) return;
    setSaving(true); onError(''); onMessage('');
    try {
      await businessApi.updateSettings({ ...form, defaultRetentionDays: Number(form.defaultRetentionDays) || 365 });
      onMessage('Đã lưu cấu hình công ty.');
      await onReload();
    } catch (caught) { reportError(caught, 'Không thể lưu cấu hình.'); }
    finally { setSaving(false); }
  };

  const handleCreateContact = async () => {
    if (!canEdit) return;
    setCreatingContact(true); onError(''); onMessage('');
    try {
      await businessApi.createContact(contactForm);
      setContactForm(blankContactForm); setContactModalOpen(false);
      onMessage('Đã thêm người liên hệ.'); await onReload();
    } catch (caught) { reportError(caught, 'Không thể thêm người liên hệ.'); }
    finally { setCreatingContact(false); }
  };

  const handleEditContact = (c: ContactResponse) => {
    setEditingContact(c);
    setContactForm({ fullName: c.fullName, email: c.email, phone: c.phone ?? '', jobTitle: c.jobTitle ?? '', isPrimary: c.isPrimary, isBillingContact: c.isBillingContact });
    setContactModalOpen(true);
  };

  const handleSaveContact = async () => {
    if (!canEdit || !editingContact) return;
    setCreatingContact(true); onError(''); onMessage('');
    try {
      await businessApi.updateContact(editingContact.id, contactForm);
      setEditingContact(null); setContactForm(blankContactForm); setContactModalOpen(false);
      onMessage('Đã cập nhật người liên hệ.'); await onReload();
    } catch (caught) { reportError(caught, 'Không thể cập nhật người liên hệ.'); }
    finally { setCreatingContact(false); }
  };

  const handleDeleteContact = async (id: string) => {
    if (!canEdit || !confirm('Xóa người liên hệ này?')) return;
    try { await businessApi.deleteContact(id); onMessage('Đã xóa người liên hệ.'); await onReload(); }
    catch (caught) { reportError(caught, 'Không thể xóa người liên hệ.'); }
  };

  const closeModal = () => { setContactModalOpen(false); setEditingContact(null); setContactForm(blankContactForm); };

  return (
    <>
      <div className="company-settings-grid">
        <section className="card glass bizops-side-card">
          <div className="company-logo-box">
            {settings.logoUrl
              ? <img className="company-logo-image" src={settings.logoUrl} alt={tenant.companyName} />
              : <div className="company-logo-preview">{companyInitials(tenant.companyName)}</div>}
            <strong>{tenant.companyName}</strong>
            <span>{tenant.code} · {tenant.currentPlan || 'Chưa có gói'}</span>
          </div>
          <div className="company-summary-list">
            <div><span>Tên pháp lý</span><strong>{tenant.legalName || tenant.companyName}</strong></div>
            <div><span>Mã số thuế</span><strong>{tenant.taxCode || '-'}</strong></div>
            <div><span>Domain</span><strong>{tenant.emailDomain || settings.primaryDomain || '-'}</strong></div>
            <div><span>Chủ sở hữu</span><strong>{tenant.ownerName}</strong></div>
            <div><span>Email owner</span><strong>{tenant.ownerEmail}</strong></div>
            <div><span>Trạng thái</span><strong>{statusPill(tenant.status ?? '')}</strong></div>
            <div><span>Trial hết hạn</span><strong>{formatDate(tenant.trialEndsAt)}</strong></div>
            <div><span>Cập nhật</span><strong>{formatDate(settings.updatedAt)}</strong></div>
          </div>
        </section>

        <section className="card glass bizops-panel">
          <div className="bizops-panel-title">
            <div><Settings size={18} /><h2>Thiết lập công ty</h2></div>
            <button className="btn-secondary" type="button" onClick={() => void onReload()}>
              <RefreshCw size={14} /> Tải lại
            </button>
          </div>
          {!canEdit && <p className="bizops-muted">Chỉ TenantOwner được phép thay đổi cấu hình.</p>}
          <form className="bizops-form-grid" onSubmit={e => { e.preventDefault(); void handleSaveSettings(); }}>
            <label>Logo URL<input value={form.logoUrl ?? ''} disabled={!canEdit} onChange={e => setField('logoUrl', e.target.value)} placeholder="https://..." /></label>
            <label>Domain chính<input value={form.primaryDomain ?? ''} disabled={!canEdit} onChange={e => setField('primaryDomain', e.target.value)} placeholder="company.com" /></label>
            <label>Retention (ngày)<input type="number" min={1} max={3650} value={form.defaultRetentionDays} disabled={!canEdit} onChange={e => setField('defaultRetentionDays', Number(e.target.value))} /></label>
            <label>Múi giờ<select value={form.timeZone} disabled={!canEdit} onChange={e => setField('timeZone', e.target.value)}>
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option><option value="Asia/Bangkok">Asia/Bangkok</option>
              <option value="Asia/Singapore">Asia/Singapore</option><option value="UTC">UTC</option>
            </select></label>
            <label>Locale<select value={form.locale} disabled={!canEdit} onChange={e => setField('locale', e.target.value)}>
              <option value="vi-VN">vi-VN</option><option value="en-US">en-US</option>
            </select></label>
            <label>Mã ngân hàng<input value={form.bankCode ?? ''} disabled={!canEdit} onChange={e => setField('bankCode', e.target.value)} placeholder="VCB, TCB, BIDV..." /></label>
            <label>Số tài khoản<input value={form.bankAccountNumber ?? ''} disabled={!canEdit} onChange={e => setField('bankAccountNumber', e.target.value)} /></label>
            <label>Tên tài khoản<input value={form.bankAccountName ?? ''} disabled={!canEdit} onChange={e => setField('bankAccountName', e.target.value)} /></label>
            <label className="wide">Webhook thanh toán<input value={form.paymentWebhookUrl ?? ''} disabled={!canEdit} onChange={e => setField('paymentWebhookUrl', e.target.value)} placeholder="https://billing.company.com/webhook" /></label>
            <label className="wide">Địa chỉ xuất hóa đơn<textarea value={form.billingAddress ?? ''} disabled={!canEdit} onChange={e => setField('billingAddress', e.target.value)} /></label>
            <div className="bizops-actions company-form-actions">
              <button className="btn-primary" type="submit" disabled={!canEdit || saving}>
                <Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Contacts */}
      <section className="card glass bizops-panel">
        <div className="bizops-panel-title">
          <div><Users size={18} /><h2>Người liên hệ</h2></div>
          {canEdit && (
            <button className="btn-primary" type="button" onClick={() => { setEditingContact(null); setContactForm(blankContactForm); setContactModalOpen(true); }}>
              <Plus size={14} /> Thêm người liên hệ
            </button>
          )}
        </div>
        <div className="company-contact-grid">
          {contacts.map(c => (
            <div className="company-contact-card" key={c.id}>
              <div><strong>{c.fullName}</strong><span>{c.jobTitle || 'Chưa có chức danh'}</span></div>
              <p>{c.email}</p>
              <p>{c.phone || '-'}</p>
              <div className="bizops-actions">
                {c.isPrimary && <span className="bizops-status active">Liên hệ chính</span>}
                {c.isBillingContact && <span className="bizops-status waiting">Thanh toán</span>}
              </div>
              {canEdit && (
                <div className="bizops-actions mt-2">
                  <button className="btn-secondary text-xs" onClick={() => handleEditContact(c)}><Edit size={12} /> Sửa</button>
                  <button className="btn-secondary text-xs danger" onClick={() => handleDeleteContact(c.id)}><Trash2 size={12} /> Xóa</button>
                </div>
              )}
            </div>
          ))}
          {contacts.length === 0 && <div className="company-contact-empty">Chưa có người liên hệ.</div>}
        </div>
      </section>

      {/* Contact Modal */}
      {contactModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card contact-modal-card glass">
            <div className="modal-header contact-modal-header">
              <div className="contact-modal-title">
                <span><Users size={18} /></span>
                <div><h2>{editingContact ? 'Sửa người liên hệ' : 'Thêm người liên hệ'}</h2>
                  <p>Thông tin dùng cho vận hành, hóa đơn và thông báo.</p></div>
              </div>
              <button className="modal-close" type="button" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); void (editingContact ? handleSaveContact() : handleCreateContact()); }}>
              <div className="modal-body contact-modal-body">
                <label className="contact-field">Họ tên<input required value={contactForm.fullName} onChange={e => setContactForm({ ...contactForm, fullName: e.target.value })} placeholder="VD: Nguyễn Văn A" /></label>
                <label className="contact-field">Email<input required type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} placeholder="name@company.com" /></label>
                <label className="contact-field">Điện thoại<input value={contactForm.phone ?? ''} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} placeholder="090..." /></label>
                <label className="contact-field">Chức danh<input value={contactForm.jobTitle ?? ''} onChange={e => setContactForm({ ...contactForm, jobTitle: e.target.value })} placeholder="VD: Kế toán, IT Manager" /></label>
                <div className="contact-role-options">
                  <label className="contact-role-card">
                    <input type="checkbox" checked={contactForm.isPrimary} onChange={e => setContactForm({ ...contactForm, isPrimary: e.target.checked })} />
                    <span>Liên hệ chính</span><small>Nhận thông báo vận hành.</small>
                  </label>
                  <label className="contact-role-card">
                    <input type="checkbox" checked={contactForm.isBillingContact} onChange={e => setContactForm({ ...contactForm, isBillingContact: e.target.checked })} />
                    <span>Liên hệ thanh toán</span><small>Nhận hóa đơn và xác nhận chuyển khoản.</small>
                  </label>
                </div>
              </div>
              <div className="modal-footer contact-modal-footer">
                <button className="btn-secondary" type="button" onClick={closeModal} disabled={creatingContact}>Hủy</button>
                <button className="btn-primary" type="submit" disabled={creatingContact}>
                  {creatingContact ? 'Đang xử lý...' : (editingContact ? 'Lưu thay đổi' : 'Thêm liên hệ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// ====== QUOTATIONS ======
const QuotationsView: React.FC<{
  quotations: QuotationResponse[];
  plans: ProductPlanResponse[];
  isTenantOwner: boolean;
  onReload: () => void;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}> = ({ quotations, plans, isTenantOwner, onReload, onError, onMessage }) => {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ productPlanId: '', billingCycle: 'Yearly', userQuantity: 10, deviceQuantity: 20, discountAmount: 0, taxPercent: 10, terms: '' });

  const selectedPlan = plans.find(p => p.id === form.productPlanId);

  const handleCreate = async () => {
    if (!form.productPlanId) { onError('Vui lòng chọn gói dịch vụ.'); return; }
    setCreating(true); onError('');
    try {
      await businessApi.createQuotation({
        productPlanId: form.productPlanId, billingCycle: form.billingCycle,
        userQuantity: form.userQuantity, deviceQuantity: form.deviceQuantity,
        discountAmount: form.discountAmount, taxPercent: form.taxPercent, terms: form.terms,
        validUntil: new Date(Date.now() + 14 * 86400000).toISOString()
      });
      onMessage('Đã tạo báo giá.');
      setShowCreate(false);
      setForm({ productPlanId: '', billingCycle: 'Yearly', userQuantity: 10, deviceQuantity: 20, discountAmount: 0, taxPercent: 10, terms: '' });
      await onReload();
    } catch (caught) { onError(caught instanceof Error ? caught.message : 'Không thể tạo báo giá.'); }
    finally { setCreating(false); }
  };

  const handleConvert = async (id: string) => {
    if (!confirm('Chuyển báo giá này thành đơn hàng?')) return;
    try {
      const result = await businessApi.convertQuotation(id);
      onMessage(`Đã chuyển thành đơn hàng ${result.orderNumber}.`);
      await onReload(); navigate('/app/business/orders');
    } catch (caught) { onError(caught instanceof Error ? caught.message : 'Không thể chuyển báo giá.'); }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="card glass bizops-panel">
        <div className="bizops-panel-title">
          <div><FileText size={18} /><h2>Danh sách báo giá</h2></div>
          {isTenantOwner && (
            <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
              <Plus size={14} /> Tạo báo giá
            </button>
          )}
        </div>

        {showCreate && (
          <div className="bizops-inline-form mb-6">
            <h3>Tạo báo giá mới</h3>
            <div className="bizops-form-grid">
              <label className="wide">
                Gói dịch vụ
                <select value={form.productPlanId} onChange={e => setForm({ ...form, productPlanId: e.target.value })}>
                  <option value="">-- Chọn gói --</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({formatVnd(p.monthlyPrice * p.includedUsers)}/tháng)</option>)}
                </select>
              </label>
              <label>Chu kỳ thanh toán<select value={form.billingCycle} onChange={e => setForm({ ...form, billingCycle: e.target.value })}>
                <option value="Monthly">Hàng tháng</option><option value="Yearly">Hàng năm</option>
              </select></label>
              <label>Số user<input type="number" min={1} value={form.userQuantity} onChange={e => setForm({ ...form, userQuantity: Number(e.target.value) })} /></label>
              <label>Số thiết bị<input type="number" min={1} value={form.deviceQuantity} onChange={e => setForm({ ...form, deviceQuantity: Number(e.target.value) })} /></label>
              <label>Giảm giá (VND)<input type="number" min={0} value={form.discountAmount} onChange={e => setForm({ ...form, discountAmount: Number(e.target.value) })} /></label>
              <label>Thuế (%)<input type="number" min={0} max={100} value={form.taxPercent} onChange={e => setForm({ ...form, taxPercent: Number(e.target.value) })} /></label>
              <label className="wide">Ghi chú / Điều khoản<textarea value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} placeholder="Điều khoản báo giá..." /></label>
              {selectedPlan && (
                <div className="col-span-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <strong className="text-emerald-300">Tổng tiền dự kiến:</strong>
                  <div className="text-2xl font-bold mt-1">{formatVnd((selectedPlan.monthlyPrice * (form.billingCycle === 'Yearly' ? 12 : 1) * form.userQuantity - form.discountAmount) * (1 + form.taxPercent / 100))}</div>
                  <small className="text-gray-400">{selectedPlan.name} x {form.userQuantity} user x {form.billingCycle === 'Yearly' ? '12 tháng' : '1 tháng'} - Thuế {form.taxPercent}% - Giảm {formatVnd(form.discountAmount)}</small>
                </div>
              )}
            </div>
            <div className="bizops-actions">
              <button className="btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Đang tạo...' : 'Tạo báo giá'}</button>
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Hủy</button>
            </div>
          </div>
        )}

        <div className="bizops-table-wrap">
          <table className="bizops-table">
            <thead><tr>
              <th>Mã báo giá</th><th>Gói</th><th>User / Device</th><th>Tổng tiền</th><th>Trạng thái</th><th>Hạn</th><th>Thao tác</th>
            </tr></thead>
            <tbody>
              {quotations.map(q => (
                <tr key={q.id}>
                  <td><strong>{q.quotationNumber}</strong><br /><small>{new Date(q.createdAt).toLocaleDateString('vi-VN')}</small></td>
                  <td>{q.planName} ({q.billingCycle})</td>
                  <td>{q.userQuantity} / {q.deviceQuantity}</td>
                  <td><strong>{formatVnd(q.totalAmount)}</strong><br /><small>{q.discountAmount > 0 ? `-${formatVnd(q.discountAmount)} giảm` : ''}</small></td>
                  <td>{statusPill(q.status)}</td>
                  <td>{new Date(q.validUntil).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <div className="bizops-actions">
                      {(q.status === 'Draft' || q.status === 'Issued') && isTenantOwner && (
                        <button className="btn-primary text-xs" onClick={() => handleConvert(q.id)}>Chuyển thành đơn</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {quotations.length === 0 && <tr><td colSpan={7} className="text-center p-4">Chưa có báo giá nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default BusinessOperations;
