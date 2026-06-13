import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  Download,
  FileText,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Upload,
  Users
} from 'lucide-react';

type BillingPlanKey = 'starter' | 'professional' | 'enterprise';
type BillingPeriod = 'monthly' | 'annual';
type PaymentStatus = 'waiting' | 'reviewing' | 'confirmed';

interface BillingPlan {
  key: BillingPlanKey;
  name: string;
  priceVndPerUser: number;
  minimumVnd: number;
  licenseNote: string;
}

const billingPlans: BillingPlan[] = [
  {
    key: 'starter',
    name: 'Starter',
    priceVndPerUser: 60000,
    minimumVnd: 1500000,
    licenseNote: 'Phù hợp đội nhỏ, chặn secret và PII cơ bản.'
  },
  {
    key: 'professional',
    name: 'Professional',
    priceVndPerUser: 180000,
    minimumVnd: 8000000,
    licenseNote: 'Gói bán chính: approval, file scan, report và policy builder.'
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    priceVndPerUser: 450000,
    minimumVnd: 50000000,
    licenseNote: 'Cho private cloud/on-premise, SSO, SIEM và yêu cầu tuân thủ.'
  }
];

const bankInfo = {
  bankName: 'Vietcombank',
  bankBin: '970436',
  accountNo: '0123456789',
  accountName: 'AIGUARD JSC DEMO',
  branch: 'Chi nhánh TP. Hồ Chí Minh'
};

export const PaymentConfirmation: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanKey>('professional');
  const [users, setUsers] = useState(120);
  const [period, setPeriod] = useState<BillingPeriod>('annual');
  const [agentAddon, setAgentAddon] = useState(true);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('waiting');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const plan = billingPlans.find(item => item.key === selectedPlan) ?? billingPlans[1];
  const order = useMemo(() => {
    const baseMonthly = Math.max(plan.minimumVnd, plan.priceVndPerUser * users);
    const addonMonthly = agentAddon ? Math.max(1500000, Math.round(users * 35000)) : 0;
    const subtotalMonthly = baseMonthly + addonMonthly;
    const discount = period === 'annual' ? Math.round(subtotalMonthly * 12 * 0.1) : 0;
    const total = period === 'annual' ? subtotalMonthly * 12 - discount : subtotalMonthly;
    const orderCode = `AIG-${plan.key.toUpperCase()}-${users}-${period === 'annual' ? '12M' : '1M'}`;
    const transferContent = `${orderCode} THANH TOAN AIGUARD`;
    const qrUrl = `https://img.vietqr.io/image/${bankInfo.bankBin}-${bankInfo.accountNo}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankInfo.accountName)}`;

    return {
      baseMonthly,
      addonMonthly,
      discount,
      subtotalMonthly,
      total,
      orderCode,
      transferContent,
      qrUrl
    };
  }, [agentAddon, period, plan, users]);

  const copyValue = (label: string, value: string) => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(null), 1400);
    });
  };

  const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setStatus('reviewing');
  };

  return (
    <div className="payment-page">
      <div className="page-header payment-page-header">
        <div>
          <h1>Xác nhận thanh toán</h1>
          <p className="subtitle">
            Trang demo cho quy trình chốt đơn: tạo mã đơn, quét QR chuyển khoản, upload biên lai và kích hoạt license AIGuard.
          </p>
        </div>
        <Link className="btn-secondary payment-back-link" to="/app/business/packages">
          Quay lại gói bán
        </Link>
      </div>

      <section className="payment-hero card glass">
        <div className="payment-order-panel">
          <span className="eyebrow"><CreditCard size={14} /> Payment Checkout</span>
          <h2>Thanh toán gói {plan.name}</h2>
          <p>
            Khách hàng quét QR bằng app ngân hàng, chuyển đúng số tiền và nội dung. Sales hoặc kế toán xác nhận biên lai
            để chuyển trạng thái đơn hàng sang đã thanh toán và sẵn sàng cấp license.
          </p>

          <div className="payment-form-grid">
            <label>
              Gói dịch vụ
              <select value={selectedPlan} onChange={event => setSelectedPlan(event.target.value as BillingPlanKey)}>
                {billingPlans.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}
              </select>
            </label>
            <label>
              Số người dùng
              <input type="number" min={1} value={users} onChange={event => setUsers(Number(event.target.value))} />
            </label>
            <label>
              Kỳ thanh toán
              <select value={period} onChange={event => setPeriod(event.target.value as BillingPeriod)}>
                <option value="monthly">Thanh toán tháng</option>
                <option value="annual">Thanh toán năm - giảm 10%</option>
              </select>
            </label>
            <label className="payment-check">
              <input type="checkbox" checked={agentAddon} onChange={event => setAgentAddon(event.target.checked)} />
              Kèm AI Agent Governance add-on
            </label>
          </div>

          <div className="payment-license-note">
            <ShieldCheck size={18} />
            <div>
              <strong>{plan.licenseNote}</strong>
              <span>Mã đơn: {order.orderCode}</span>
            </div>
          </div>
        </div>

        <div className="payment-qr-panel">
          <div className="payment-status-pill">
            {status === 'confirmed' ? <CheckCircle2 size={15} /> : <Clock size={15} />}
            <span>{statusLabel(status)}</span>
          </div>
          <div className="payment-qr-frame">
            <img src={order.qrUrl} alt={`QR thanh toán ${order.orderCode}`} />
          </div>
          <strong>Quét QR để thanh toán</strong>
          <span className="payment-qr-caption">QR demo theo chuẩn VietQR. Thay tài khoản demo bằng tài khoản công ty khi triển khai thật.</span>
        </div>
      </section>

      <section className="payment-grid">
        <div className="card glass payment-summary-card">
          <div className="section-title">
            <ClipboardList size={18} />
            <h2>Thông tin chuyển khoản</h2>
          </div>

          <PaymentCopyRow label="Ngân hàng" value={`${bankInfo.bankName} · ${bankInfo.branch}`} copiedField={copiedField} onCopy={copyValue} />
          <PaymentCopyRow label="Số tài khoản" value={bankInfo.accountNo} copiedField={copiedField} onCopy={copyValue} />
          <PaymentCopyRow label="Tên tài khoản" value={bankInfo.accountName} copiedField={copiedField} onCopy={copyValue} />
          <PaymentCopyRow label="Nội dung" value={order.transferContent} copiedField={copiedField} onCopy={copyValue} />

          <div className="payment-total-box">
            <div><span>Subscription mỗi tháng</span><strong>{formatVnd(order.baseMonthly)}</strong></div>
            <div><span>Agent add-on mỗi tháng</span><strong>{formatVnd(order.addonMonthly)}</strong></div>
            <div><span>Giảm giá năm</span><strong>-{formatVnd(order.discount)}</strong></div>
            <div className="grand-total"><span>Tổng cần thanh toán</span><strong>{formatVnd(order.total)}</strong></div>
          </div>
        </div>

        <div className="card glass payment-confirm-card">
          <div className="section-title">
            <QrCode size={18} />
            <h2>Xác nhận biên lai</h2>
          </div>

          <div className="payment-upload-box">
            <Upload size={28} />
            <strong>Upload ảnh/PDF biên lai</strong>
            <span>{uploadedFileName || 'Chưa có biên lai nào được chọn'}</span>
            <label className="btn-secondary payment-upload-button">
              Chọn biên lai
              <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} />
            </label>
          </div>

          <div className="payment-actions">
            <button className="btn-secondary" type="button" onClick={() => setStatus('waiting')}>
              <RefreshCw size={14} /> Đặt lại
            </button>
            <button className="btn-primary" type="button" disabled={!uploadedFileName} onClick={() => setStatus('confirmed')}>
              <CheckCircle2 size={14} /> Xác nhận đã nhận tiền
            </button>
          </div>

          <div className="payment-warning">
            <AlertTriangle size={16} />
            <span>Demo frontend chưa tự đối soát ngân hàng. Bản production cần backend ký đơn hàng, webhook thanh toán và audit log.</span>
          </div>
        </div>
      </section>

      <section className="payment-grid">
        <div className="card glass payment-method-card">
          <div className="section-title">
            <Banknote size={18} />
            <h2>Kênh thanh toán</h2>
          </div>
          <div className="payment-method-list">
            <PaymentMethod icon={<Building2 size={18} />} title="Chuyển khoản ngân hàng" status="Đang bật" />
            <PaymentMethod icon={<QrCode size={18} />} title="VietQR / QR ngân hàng" status="Đang bật" />
            <PaymentMethod icon={<CreditCard size={18} />} title="VNPay / PayOS" status="Chờ tích hợp backend" />
            <PaymentMethod icon={<FileText size={18} />} title="Xuất hóa đơn VAT" status="Chờ module kế toán" />
          </div>
        </div>

        <div className="card glass payment-method-card">
          <div className="section-title">
            <Users size={18} />
            <h2>Luồng cấp license</h2>
          </div>
          <div className="payment-timeline">
            <div className="done"><CheckCircle2 size={16} /><strong>Tạo đơn</strong><span>{order.orderCode}</span></div>
            <div className={status !== 'waiting' ? 'done' : ''}><Clock size={16} /><strong>Nhận biên lai</strong><span>{uploadedFileName || 'Đang chờ khách gửi'}</span></div>
            <div className={status === 'confirmed' ? 'done' : ''}><ShieldCheck size={16} /><strong>Kích hoạt license</strong><span>{status === 'confirmed' ? 'Sẵn sàng cấp key' : 'Chờ xác nhận thanh toán'}</span></div>
          </div>
          <button className="btn-secondary payment-download-btn" type="button">
            <Download size={14} /> Tải phiếu báo giá tạm tính
          </button>
        </div>
      </section>
    </div>
  );
};

interface PaymentCopyRowProps {
  label: string;
  value: string;
  copiedField: string | null;
  onCopy: (label: string, value: string) => void;
}

const PaymentCopyRow: React.FC<PaymentCopyRowProps> = ({ label, value, copiedField, onCopy }) => (
  <div className="payment-copy-row">
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
    <button type="button" onClick={() => onCopy(label, value)}>
      {copiedField === label ? <CheckCircle2 size={15} /> : <Copy size={15} />}
      {copiedField === label ? 'Đã copy' : 'Copy'}
    </button>
  </div>
);

interface PaymentMethodProps {
  icon: React.ReactNode;
  title: string;
  status: string;
}

const PaymentMethod: React.FC<PaymentMethodProps> = ({ icon, title, status }) => (
  <div className="payment-method-item">
    <span>{icon}</span>
    <div>
      <strong>{title}</strong>
      <small>{status}</small>
    </div>
  </div>
);

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);
}

function statusLabel(status: PaymentStatus) {
  if (status === 'confirmed') return 'Đã xác nhận';
  if (status === 'reviewing') return 'Đang đối soát';
  return 'Chờ thanh toán';
}

export default PaymentConfirmation;
