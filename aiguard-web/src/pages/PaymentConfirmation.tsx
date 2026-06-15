import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  RefreshCw,
  Upload
} from 'lucide-react';
import type { OrderResponse, ProductPlanResponse } from '../api/platform';
import { useAuth } from '../contexts/AuthContext';

type PaymentStatus = 'waiting' | 'reviewing' | 'confirmed';

const bankInfo = {
  bankName: 'Vietcombank',
  bankBin: '970436',
  accountNo: '0123456789',
  accountName: 'AIGUARD JSC DEMO',
  branch: 'Chi nhánh TP. Hồ Chí Minh'
};

export const PaymentConfirmation: React.FC = () => {
  const { user } = useAuth();
  const canConfirmPayment = user?.role === 'PlatformAdmin';
  const location = useLocation();
  const checkout = location.state as { order?: OrderResponse; plan?: ProductPlanResponse; purchaseMonths?: number } | null;
  const apiOrder = checkout?.order;
  const apiPlan = checkout?.plan;

  const [uploadedFileName, setUploadedFileName] = useState('');
  const [status, setStatus] = useState<PaymentStatus>(apiOrder?.status === 'Paid' ? 'confirmed' : 'waiting');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [purchaseMonths, setPurchaseMonths] = useState(() => checkout?.purchaseMonths || (apiOrder?.billingCycle === 'Yearly' ? 12 : 1));

  const orderDetails = useMemo(() => {
    if (!apiOrder) return null;
    const monthlyEquivalent = apiOrder.billingCycle === 'Yearly' ? apiOrder.totalAmount / 12 : apiOrder.totalAmount;
    const total = Math.round(monthlyEquivalent * purchaseMonths);
    const transferContent = `${apiOrder.orderNumber} ${purchaseMonths} THANG AIGUARD`;
    return {
      orderCode: apiOrder.orderNumber,
      originalTotal: apiOrder.totalAmount,
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

  const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setStatus('reviewing');
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
          <h1>Xác nhận thanh toán</h1>
          <p className="subtitle">
            Vui lòng quét mã QR chuyển khoản chính xác số tiền bên dưới, sau đó tải ảnh biên lai giao dịch lên để hoàn tất xác nhận thanh toán đơn hàng.
          </p>
        </div>
        <Link className="btn-secondary payment-back-link" to="/app/business/packages">
          Quay lại gói bán
        </Link>
      </div>

      <div className="payment-grid">
        {/* Left Column: Summary & Bank Transfer */}
        <div className="flex flex-col gap-5">
          {/* Order Summary Card */}
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
                <strong className="text-white text-sm">{apiPlan?.name || 'Gói dịch vụ'}</strong>
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
              <label className="payment-month-select">
                <span>Thời hạn mua</span>
                <select value={purchaseMonths} onChange={event => setPurchaseMonths(Number(event.target.value))}>
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
                <span className="text-emerald-300 font-medium text-sm">Tổng tiền cần thanh toán</span>
                <strong className="text-emerald-400 text-2xl font-black">{formatVnd(orderDetails.total)}</strong>
              </div>
            </div>
          </div>

          {/* Bank Transfer Details Card */}
          <div className="card glass p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Banknote size={18} className="text-indigo-400" />
              <h3 className="text-base font-bold text-white">Thông tin chuyển khoản</h3>
            </div>

            <div className="flex flex-col gap-3">
              <PaymentCopyRow label="Ngân hàng" value={`${bankInfo.bankName} · ${bankInfo.branch}`} copiedField={copiedField} onCopy={copyValue} />
              <PaymentCopyRow label="Số tài khoản" value={bankInfo.accountNo} copiedField={copiedField} onCopy={copyValue} />
              <PaymentCopyRow label="Tên tài khoản" value={bankInfo.accountName} copiedField={copiedField} onCopy={copyValue} />
              <PaymentCopyRow label="Nội dung chuyển khoản" value={orderDetails.transferContent} copiedField={copiedField} onCopy={copyValue} />
            </div>
            
            <div className="text-xs text-amber-300/90 bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg flex gap-2 items-start mt-1">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>Lưu ý: Vui lòng nhập chính xác <strong>Nội dung chuyển khoản</strong> để hệ thống đối soát và kích hoạt đơn hàng nhanh nhất.</span>
            </div>
          </div>
        </div>

        {/* Right Column: QR Code & Receipt Confirmation */}
        <div className="flex flex-col gap-5">
          {/* QR Code & Status */}
          <div className="card glass p-5 flex flex-col items-center justify-center gap-4 text-center">
            <div className="payment-status-pill">
              {status === 'confirmed' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
              <span>{statusLabel(status)}</span>
            </div>

            <div className="payment-qr-frame">
              <img src={orderDetails.qrUrl} alt={`QR thanh toán ${orderDetails.orderCode}`} />
            </div>
            
            <div>
              <strong className="text-base font-bold text-white block">Quét mã QR để thanh toán nhanh</strong>
              <span className="text-xs text-gray-400 block mt-1">Sử dụng ứng dụng ngân hàng hoặc ví điện tử để quét mã.</span>
            </div>
          </div>

          {/* Receipt Upload Card */}
          <div className="card glass p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Upload size={18} className="text-indigo-400" />
              <h3 className="text-base font-bold text-white">Xác nhận biên lai</h3>
            </div>

            <div className="payment-upload-box">
              <Upload size={24} />
              <strong className="text-sm font-semibold">Tải ảnh/PDF biên lai giao dịch</strong>
              <span className="text-xs text-gray-400">{uploadedFileName || 'Kéo thả hoặc nhấp để tải ảnh lên'}</span>
              <label className="btn-secondary payment-upload-button cursor-pointer">
                Chọn biên lai
                <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} />
              </label>
            </div>

            <div className="payment-actions mt-1">
              <button className="btn-secondary flex-1" type="button" onClick={() => { setUploadedFileName(''); setStatus('waiting'); }}>
                <RefreshCw size={14} /> Đặt lại
              </button>
              {canConfirmPayment ? (
                <button className="btn-primary flex-1" type="button" disabled={!uploadedFileName} onClick={() => setStatus('confirmed')}>
                  <CheckCircle2 size={14} /> Xác nhận đã nhận tiền
                </button>
              ) : (
                <button className="btn-primary flex-1" type="button" disabled={!uploadedFileName || status === 'reviewing'} onClick={() => setStatus('reviewing')}>
                  <CheckCircle2 size={14} /> {status === 'reviewing' ? 'Đã gửi biên lai' : 'Gửi biên lai'}
                </button>
              )}
            </div>
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

function statusLabel(status: PaymentStatus) {
  if (status === 'confirmed') return 'Đã xác nhận';
  if (status === 'reviewing') return 'Đang đối soát';
  return 'Chờ thanh toán';
}

export default PaymentConfirmation;
