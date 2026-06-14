import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, Loader, ShieldCheck } from 'lucide-react';
import { signupApi, type PublicTrialSignupResponse } from '../api/signup';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';

export const Signup: React.FC = () => {
  const [form, setForm] = useState({
    companyName: '',
    legalName: '',
    taxCode: '',
    emailDomain: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: '',
    ownerPhone: '',
    companySize: '10-50',
    productPlanCode: 'STARTER',
    trialDays: 14,
  });
  const [result, setResult] = useState<PublicTrialSignupResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form, value: string | number) =>
    setForm(previous => ({ ...previous, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (form.ownerPassword !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (form.ownerPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    setLoading(true);
    try {
      const response = await signupApi.registerTrial({
        companyName: form.companyName,
        legalName: form.legalName,
        taxCode: form.taxCode,
        emailDomain: form.emailDomain,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        ownerPassword: form.ownerPassword,
        ownerPhone: form.ownerPhone,
        companySize: form.companySize,
        productPlanCode: form.productPlanCode,
        trialDays: Number(form.trialDays),
      });
      setResult(response);
      localStorage.setItem('aiguard_tenant_code', response.tenantCode);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Không thể đăng ký tenant dùng thử');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-shell">
        <div className="signup-topbar">
          <Link to="/" className="signup-brand">
            <ShieldCheck size={22} />
            <span>AIGuard</span>
          </Link>
          <div className="signup-actions">
            <LanguageSwitcher compact />
            <Link to="/login">Đăng nhập</Link>
          </div>
        </div>

        <section className="signup-grid">
          <div className="signup-copy">
            <span className="eyebrow">Trial doanh nghiệp</span>
            <h1>Đăng ký tenant AIGuard cho công ty của bạn</h1>
            <p>
              Hệ thống sẽ tạo tenant riêng, tài khoản Tenant Owner, trial subscription,
              license dùng thử, enrollment token và checklist onboarding.
            </p>
            <div className="signup-flow-card">
              {[
                'Tạo tenant và tài khoản Tenant Owner',
                'Xác minh email, đặt mật khẩu đầu tiên',
                'Đăng nhập và bắt buộc thiết lập MFA',
                'Cấu hình user, phòng ban, extension và policy',
              ].map(step => (
                <div key={step}><CheckCircle2 size={16} /> {step}</div>
              ))}
            </div>
          </div>

          <div className="signup-card">
            {!result ? (
              <form onSubmit={submit} className="signup-form">
                <div>
                  <h2>Thông tin doanh nghiệp</h2>
                  <p>Nhân viên không tự tạo tenant. Tenant chỉ được tạo cho doanh nghiệp.</p>
                  <p>Mã tenant sẽ được hệ thống tự tạo theo domain hoặc tên công ty và hiển thị sau khi đăng ký.</p>
                </div>
                {error && <div className="login-error">{error}</div>}

                <label>Tên công ty
                  <input required value={form.companyName} onChange={e => update('companyName', e.target.value)} />
                </label>
                <label>Mã số thuế
                  <input value={form.taxCode} onChange={e => update('taxCode', e.target.value)} />
                </label>
                <label>Domain email công ty
                  <input required value={form.emailDomain} onChange={e => update('emailDomain', e.target.value)} placeholder="company.com" />
                </label>
                <label>Người đại diện
                  <input required value={form.ownerName} onChange={e => update('ownerName', e.target.value)} />
                </label>
                <label>Email người đại diện
                  <input required type="email" value={form.ownerEmail} onChange={e => update('ownerEmail', e.target.value)} placeholder="owner@company.com" />
                </label>
                <label>Mật khẩu tài khoản chủ
                  <input required minLength={8} type="password" value={form.ownerPassword} onChange={e => update('ownerPassword', e.target.value)} placeholder="Tối thiểu 8 ký tự" />
                </label>
                <label>Nhập lại mật khẩu
                  <input required minLength={8} type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
                </label>
                <label>Số điện thoại
                  <input value={form.ownerPhone} onChange={e => update('ownerPhone', e.target.value)} />
                </label>
                <label>Quy mô nhân viên
                  <select value={form.companySize} onChange={e => update('companySize', e.target.value)}>
                    <option value="1-10">1-10</option>
                    <option value="10-50">10-50</option>
                    <option value="50-300">50-300</option>
                    <option value="300+">300+</option>
                  </select>
                </label>
                <label>Gói muốn dùng thử
                  <select value={form.productPlanCode} onChange={e => update('productPlanCode', e.target.value)}>
                    <option value="STARTER">Starter</option>
                    <option value="BUSINESS">Business</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </label>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? <><Loader size={16} className="animate-spin" /> Đang tạo tenant...</> : <>Tạo trial tenant <ArrowRight size={16} /></>}
                </button>
              </form>
            ) : (
              <div className="signup-success">
                <Building2 size={34} />
                <h2>Tenant đã được tạo</h2>
                <p>
                  Tenant <strong>{result?.tenantCode}</strong> đã được kích hoạt.
                  Người đại diện có thể đăng nhập ngay bằng email và mật khẩu vừa tạo.
                </p>
                <div className="signup-result-box">
                  <span>Công ty: <strong>{result?.companyName}</strong></span>
                  <span>Tài khoản chủ: <strong>{result?.ownerEmail}</strong></span>
                  <span>Trial đến: <strong>{result?.trialEndsAt ? new Date(result.trialEndsAt).toLocaleDateString('vi-VN') : ''}</strong></span>
                </div>
                <Link className="btn-primary" to={`/login?tenant=${encodeURIComponent(result.tenantCode)}`}>
                  Đăng nhập ngay
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Signup;
