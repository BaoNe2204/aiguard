import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, KeyRound, Loader, ShieldCheck } from 'lucide-react';
import { signupApi, type VerifyTrialSignupResponse } from '../api/signup';

export const VerifySignup: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [result, setResult] = useState<VerifyTrialSignupResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await signupApi.verify(token, password);
      localStorage.setItem('aiguard_tenant_code', response.tenantCode);
      setResult(response);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Token xác minh không hợp lệ hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="verify-card">
        <div className="login-logo"><ShieldCheck size={34} /></div>
        {!result ? (
          <form onSubmit={submit} className="signup-form">
            <div>
              <h1>Xác minh Tenant Owner</h1>
              <p>Nhập token xác minh và đặt mật khẩu đầu tiên cho tài khoản chủ doanh nghiệp.</p>
            </div>
            {error && <div className="login-error">{error}</div>}
            <label>Verification token
              <textarea required value={token} onChange={e => setToken(e.target.value)} />
            </label>
            <label>Mật khẩu mới
              <input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </label>
            <label>Nhập lại mật khẩu
              <input required minLength={8} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </label>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <><Loader size={16} className="animate-spin" /> Đang xác minh...</> : <><KeyRound size={16} /> Xác minh và kích hoạt</>}
            </button>
          </form>
        ) : (
          <div className="signup-success">
            <CheckCircle2 size={38} />
            <h1>Đã xác minh email</h1>
            <p>
              Tài khoản <strong>{result.ownerEmail}</strong> đã được kích hoạt trong tenant
              <strong> {result.tenantCode}</strong>. Bước tiếp theo là đăng nhập và thiết lập MFA.
            </p>
            <Link className="btn-primary" to={`/login?tenant=${encodeURIComponent(result.tenantCode)}`}>
              Đăng nhập và thiết lập MFA
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifySignup;
