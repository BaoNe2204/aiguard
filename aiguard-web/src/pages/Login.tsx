import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Loader, Lock, Mail, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';

interface PendingMfa {
  tenantCode: string;
  challengeToken: string;
  setupRequired: boolean;
  setupSecret?: string;
  provisioningUri?: string;
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, verifyMfa } = useAuth();
  const { t } = useLanguage();
  const [tenantCode, setTenantCode] = useState(
    searchParams.get('tenant') ||
    localStorage.getItem('aiguard_tenant_code') ||
    'DEFAULT'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [pendingMfa, setPendingMfa] = useState<PendingMfa | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const goToHome = (role: string) => {
    if (role === 'Employee') navigate('/app/my-usage/logs');
    else if (role === 'PlatformAdmin') navigate('/app/business/operations');
    else if (role === 'TenantOwner') navigate('/app/business/onboarding');
    else navigate('/app/dashboard');
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantCode.trim() || !email.trim() || !password) {
      setError(t('Please fill in all fields', 'Vui lòng điền đầy đủ thông tin'));
      return;
    }

    setError('');
    setLoading(true);
    try {
      const normalizedTenant = tenantCode.trim().toUpperCase();
      const result = await login(normalizedTenant, email.trim(), password);
      if (result.requiresMfa) {
        if (!result.mfaChallengeToken) throw new Error('MFA challenge is missing');
        setPendingMfa({
          tenantCode: normalizedTenant,
          challengeToken: result.mfaChallengeToken,
          setupRequired: !!result.mfaSetupRequired,
          setupSecret: result.mfaSetupSecret,
          provisioningUri: result.mfaProvisioningUri,
        });
        setMfaCode('');
        return;
      }

      if (!result.user) throw new Error('Login response is missing user profile');
      goToHome(result.user.role);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t('Login failed', 'Đăng nhập thất bại'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingMfa) return;
    if (!mfaCode.trim()) {
      setError(t('Please enter MFA code', 'Vui lòng nhập mã MFA'));
      return;
    }

    setError('');
    setLoading(true);
    try {
      const user = await verifyMfa(pendingMfa.tenantCode, pendingMfa.challengeToken, mfaCode.trim());
      goToHome(user.role);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t('MFA failed', 'Xác thực MFA thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-overlay"></div>
      <div className="login-language"><LanguageSwitcher /></div>
      <div className="login-card">
        <div className="login-card-header">
          <div className="login-logo">
            <Shield size={36} className="text-indigo-500" />
          </div>
          <h1>AIGuard Control Tower</h1>
          <p className="subtitle">
            {t(
              'Endpoint AI DLP & Agent Protection Console',
              'Bảng điều khiển chống rò rỉ dữ liệu AI và bảo vệ Agent',
            )}
          </p>
        </div>

        {!pendingMfa ? (
          <form onSubmit={handleLogin} className="login-form">
            {error && <div className="login-error">{error}</div>}

            <div className="form-group">
              <label>{t('Work Email', 'Email công việc')}</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="owner@company.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t('Password', 'Mật khẩu')}</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t('Enter password', 'Nhập mật khẩu')}
                  disabled={loading}
                />
              </div>
              <div className="flex justify-end mt-2">
                <a href="#forgot" className="forgot-link text-xs text-indigo-400 hover:text-indigo-300">
                  {t('Forgot?', 'Quên mật khẩu?')}
                </a>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader size={16} className="animate-spin" />
                  {t('Signing in...', 'Đang đăng nhập...')}
                </span>
              ) : t('Sign In', 'Đăng nhập')}
            </button>

            <div className="login-register-note">
              Chưa có tenant? <Link to="/signup">Đăng ký doanh nghiệp dùng thử</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyMfa} className="login-form">
            {error && <div className="login-error">{error}</div>}

            <div className="mfa-panel">
              <div className="mfa-icon"><KeyRound size={22} /></div>
              <div>
                <h2>{pendingMfa.setupRequired ? 'Thiết lập MFA' : 'Xác thực MFA'}</h2>
                <p>
                  {pendingMfa.setupRequired
                    ? 'Quét secret bằng Microsoft Authenticator, Google Authenticator hoặc 1Password rồi nhập mã 6 số.'
                    : 'Nhập mã 6 số từ ứng dụng xác thực của bạn.'}
                </p>
              </div>
            </div>

            {pendingMfa.setupRequired && (
              <div className="mfa-setup-box">
                <label>Secret</label>
                <code>{pendingMfa.setupSecret}</code>
                {pendingMfa.provisioningUri && (
                  <>
                    <label>Provisioning URI</label>
                    <textarea readOnly value={pendingMfa.provisioningUri} />
                  </>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Mã MFA</label>
              <div className="input-with-icon">
                <KeyRound size={16} className="input-icon" />
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader size={16} className="animate-spin" />
                  Đang xác thực...
                </span>
              ) : 'Xác thực và vào hệ thống'}
            </button>

            <button
              type="button"
              className="login-secondary-btn"
              disabled={loading}
              onClick={() => {
                setPendingMfa(null);
                setMfaCode('');
                setError('');
              }}
            >
              Đăng nhập bằng tài khoản khác
            </button>
          </form>
        )}

        <div className="login-footer">
          <p className="text-xs text-zinc-500">
            {t('Authorized personnel only', 'Chỉ dành cho người được cấp quyền')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
