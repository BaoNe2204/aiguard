import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Copy,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import type { OrderResponse, ProductPlanResponse } from '../api/platform';
import { platformApi } from '../api/platform';
import { useAuth } from '../contexts/AuthContext';
import { businessApi } from '../api/business';

const bankInfo = {
  bankName: 'Vietcombank',
  bankBin: '970436',
  accountNo: '0123456789',
  accountName: 'AIGUARD JSC DEMO',
  branch: 'Chi nhánh TP. Hồ Chí Minh'
};

export const PaymentConfirmation: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const checkout = location.state as { order?: OrderResponse; plan?: ProductPlanResponse; purchaseMonths?: number } | null;
  const apiOrder = checkout?.order;
  const apiPlan = checkout?.plan;
  const isPlatformAdmin = user?.role === 'PlatformAdmin';
  const isTenantOwner = user?.role === 'TenantOwner';
  const canCheckout = isTenantOwner || isPlatformAdmin;

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [purchaseMonths, setPurchaseMonths] = useState(() => checkout?.purchaseMonths || (apiOrder?.billingCycle === 'Yearly' ? 12 : 1));
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [activated, setActivated] = useState(() =>
    apiOrder?.status === 'Paid' || apiOrder?.status === 'Provisioned'
  );

  const orderDetails = useMemo(() => {
    if (!apiOrder) return null;
    const monthlyEquivalent = apiOrder.billingCycle === 'Yearly' ? apiOrder.totalAmount / 12 : apiOrder.totalAmount;
    const total = Math.round(monthlyEquivalent * purchaseMonths);
    const transferContent = `${apiOrder.orderNumber} ${purchaseMonths} THANG AIGUARD`;
    return {
      orderCode: apiOrder.orderNumber,
      monthlyEquivalent,
      months: purchaseMonths,
      total,
      transferContent,
      qrUrl: `https://img.vietqr.io/image/${bankInfo.bankBin}-${bankInfo.accountNo}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankInfo.accountName)}`
    };
  }, [apiOrder, purchaseMonths]);

  const copyValue = (label: string, value: string) => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(null), 1400);
    });
  };

  const handleCheckout = async () => {
    if (!apiOrder || !orderDetails || !canCheckout) return;
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (isPlatformAdmin) {
        // PlatformAdmin: directly provision the order (creates license immediately)
        const result = await platformApi.provisionOrder(apiOrder.id);
        setLicenseKey(result.licenseKey);
        setActivated(true);
        setSuccessMessage(`Đã duyệt và cấp license "${result.planName}" thành công cho ${apiOrder.companyName || apiOrder.tenantCode}.`);
      } else {
        // TenantOwner: checkout flow
        const result = await businessApi.checkoutOrder(apiOrder.id, {
          amount: orderDetails.total,
          transactionReference: orderDetails.transferContent,
          periodMonths: purchaseMonths
        });
        setLicenseKey(result.license.licenseKey);
        setActivated(true);
        setSuccessMessage(`Kích hoạt gói ${result.license.planName} thành công! Bạn có thể sử dụng ngay.`);
      }
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Có lỗi xảy ra khi thanh toán. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!apiOrder || !orderDetails) {
    return (
      <div className="payment-page p-4">
        <div className="card glass p-8 text-center max-w-lg mx-auto my-12 flex flex-col gap-4 items-center">
          <AlertTriangle size={36} className="text-amber-500" />
          <h2 className="text-xl font-bold">Không tìm thấy thông tin đơn hàng</h2>
          <p className="text-gray-400">Vui lòng chọn một gói dịch vụ từ trang bảng giá để tạo đơn hàng trước khi tiến hành thanh toán.</p>
          <Link className="btn-primary mt-2" to="/app/business/packages">Quay lại Gói dịch vụ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="page-header payment-page-header">
        <div>
          <h1>{isPlatformAdmin ? 'Duyệt & cấp License cho đơn hàng' : 'Thanh toán & kích hoạt gói'}</h1>
          <p className="subtitle">
            {isPlatformAdmin
              ? <>Kiểm tra thông tin đơn hàng, sau đó bấm <strong>Duyệt và cấp License ngay</strong> để kích hoạt cho khách hàng.</>
              : <>Xem thông tin chuyển khoản (tuỳ chọn), sau đó bấm <strong>Thanh toán và nhận gói ngay</strong> để kích hoạt license tức thì.</>}
          </p>
        </div>
        <Link className="btn-secondary payment-back-link" to={isPlatformAdmin ? '/app/business/orders' : '/app/business/packages'}>
          {isPlatformAdmin ? 'Quay lại đơn hàng' : 'Quay lại gói bán'}
        </Link>
      </div>

      <div className="payment-grid">
        <div className="flex flex-col gap-5">
          <div className="card glass p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <ClipboardList size={18} className="text-indigo-400" />
              <h3 className="text-base font-bold text-white">Chi tiết đơn hàng</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block mb-1">Mã đơn hàng</span>
                <strong className="text-white text-sm">{orderDetails.orderCode}</strong>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Gói dịch vụ</span>
                <strong className="text-white text-sm">{apiPlan?.name || apiOrder.planName || 'Gói dịch vụ'}</strong>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Số lượng người dùng</span>
                <strong className="text-white text-sm">{apiOrder.userQuantity} users</strong>
              </div>
              <div>
                <span className="text-gray-400 block mb-1">Chu kỳ thanh toán</span>
                <strong className="text-white text-sm">
                  {apiOrder.billingCycle === 'Yearly' ? 'Theo năm (Tiết kiệm 10%)' : 'Theo tháng'}
                </strong>
              </div>
              <label className="payment-month-select col-span-2">
                <span className="block mb-1 text-gray-400">Thời hạn mua</span>
                <select
                  className="w-full p-2 rounded bg-black/20 border border-white/10 text-white"
                  value={purchaseMonths}
                  disabled={activated || submitting}
                  onChange={event => setPurchaseMonths(Number(event.target.value))}
                >
                  <option value={1}>1 tháng</option>
                  <option value={3}>3 tháng</option>
                  <option value={6}>6 tháng</option>
                  <option value={12}>12 tháng</option>
                  <option value={24}>24 tháng</option>
                  <option value={36}>36 tháng</option>
                </select>
              </label>
              <div>
                <span className="text-gray-400 block mb-1">Đơn giá quy đổi / tháng</span>
                <strong className="text-white text-sm">{formatVnd(orderDetails.monthlyEquivalent)}</strong>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 mt-1">
              <div className="payment-duration-note">
                <span>{apiPlan?.name || apiOrder.planName}</span>
                <strong>{orderDetails.months} tháng sử dụng</strong>
              </div>
              <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                <span className="text-emerald-300 font-medium text-sm">Tổng tiền</span>
                <strong className="text-emerald-400 text-2xl font-black">{formatVnd(orderDetails.total)}</strong>
              </div>
            </div>
          </div>

          <div className="card glass p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Banknote size={18} className="text-indigo-400" />
              <h3 className="text-base font-bold text-white">Thông tin chuyển khoản (tham khảo)</h3>
            </div>
            <div className="flex flex-col gap-3">
              <PaymentCopyRow label="Ngân hàng" value={`${bankInfo.bankName} · ${bankInfo.branch}`} copiedField={copiedField} onCopy={copyValue} />
              <PaymentCopyRow label="Số tài khoản" value={bankInfo.accountNo} copiedField={copiedField} onCopy={copyValue} />
              <PaymentCopyRow label="Tên tài khoản" value={bankInfo.accountName} copiedField={copiedField} onCopy={copyValue} />
              <PaymentCopyRow label="Nội dung chuyển khoản" value={orderDetails.transferContent} copiedField={copiedField} onCopy={copyValue} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="card glass p-5 flex flex-col items-center justify-center gap-4 text-center">
            <div className={`payment-status-pill ${activated ? 'confirmed' : 'waiting'}`}>
              {activated ? <CheckCircle2 size={14} /> : isPlatformAdmin ? <ShieldCheck size={14} /> : <Banknote size={14} />}
              <span>{activated ? 'Đã kích hoạt' : isPlatformAdmin ? 'Chờ duyệt' : 'Chờ thanh toán'}</span>
            </div>
            <div className="payment-qr-frame">
              <img src={orderDetails.qrUrl} alt={`QR thanh toán ${orderDetails.orderCode}`} />
            </div>
            <span className="text-xs text-gray-400">Quét mã QR nếu bạn muốn chuyển khoản thực tế trước khi xác nhận.</span>
          </div>

          <div className="card glass p-5 flex flex-col gap-4">
            {successMessage && (
              <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
                {errorMessage}
              </div>
            )}

            {licenseKey && (
              <div className="text-xs bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                  <KeyRound size={14} /> License key của bạn
                </div>
                <code className="text-white break-all text-[11px]">{licenseKey}</code>
                <button type="button" className="btn-secondary text-xs" onClick={() => copyValue('License', licenseKey)}>
                  <Copy size={12} /> Sao chép license
                </button>
              </div>
            )}

            <div className="payment-actions mt-1">
              {canCheckout ? (
                <button
                  className="btn-primary flex-1"
                  type="button"
                  disabled={submitting || activated}
                  onClick={handleCheckout}
                >
                  {isPlatformAdmin ? <ShieldCheck size={14} /> : <CheckCircle2 size={14} />}
                  {submitting
                    ? (isPlatformAdmin ? 'Đang duyệt...' : 'Đang kích hoạt...')
                    : activated
                      ? 'Đã cấp License'
                      : isPlatformAdmin
                        ? 'Duyệt và cấp License ngay'
                        : 'Thanh toán và nhận gói ngay'}
                </button>
              ) : (
                <p className="text-xs text-gray-400 text-center">Chỉ TenantOwner hoặc PlatformAdmin mới có thể thanh toán và kích hoạt gói.</p>
              )}
            </div>

            {activated && (
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => navigate('/app/business/orders')}
              >
                Xem lịch sử đơn hàng
              </button>
            )}
          </div>
        </div>
      </div>
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

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);
}

export default PaymentConfirmation;
