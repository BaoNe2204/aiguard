import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Globe,
  History,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Upload,
  User,
  XCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { myUsageApi } from '../api/myUsage';
import type { EndpointEventResponse } from '../api/endpoints';

interface SessionItem {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastSeen: string;
  current: boolean;
  active: boolean;
}

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const profileStorageKey = `aiguard_profile_preferences_${user?.id ?? 'anonymous'}`;
  const [avatarName, setAvatarName] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState('');
  const [activityEvents, setActivityEvents] = useState<EndpointEventResponse[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [form, setForm] = useState({
    fullName: user?.fullName ?? 'Người dùng AIGuard',
    email: user?.email ?? 'user@aiguard.vn',
    phone: '0900 000 000',
    jobTitle: 'Security Administrator',
    department: user?.departmentName ?? 'Security',
    language: 'vi',
    timezone: 'Asia/Bangkok',
    emailAlerts: true,
    approvalAlerts: true,
    weeklyReport: true,
    productNews: false
  });

  useEffect(() => {
    const savedProfile = localStorage.getItem(profileStorageKey);
    if (!savedProfile) return;
    try {
      const parsed = JSON.parse(savedProfile) as Partial<typeof form> & { avatarName?: string };
      setForm(previous => ({ ...previous, ...parsed }));
      if (parsed.avatarName) setAvatarName(parsed.avatarName);
    } catch {
      localStorage.removeItem(profileStorageKey);
    }
  }, [profileStorageKey]);

  const loadActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      setActivityError('');
      const result = await myUsageApi.getEvents({ page: 1, pageSize: 5 });
      setActivityEvents(result.items);
    } catch (caught: any) {
      setActivityError(caught?.message || 'Không thể tải hoạt động gần đây');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const initials = useMemo(() => {
    return form.fullName
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AI';
  }, [form.fullName]);

  const userId = user?.id ?? 'local-profile';
  const role = user?.role ?? 'Unknown';
  const authProvider = user?.authProvider ?? 'Local';
  const mfaEnabled = Boolean(user?.mfaEnabled);
  const isActive = user?.isActive ?? true;
  const sessions = useMemo<SessionItem[]>(() => {
    const browser = typeof navigator === 'undefined'
      ? 'Current browser'
      : navigator.userAgent.split(' ').slice(-2).join(' ');
    return [{
      id: 'session-current',
      device: typeof navigator === 'undefined' ? 'Current device' : navigator.platform || 'Current device',
      browser,
      ip: '-',
      location: 'Trình duyệt hiện tại',
      lastSeen: new Date().toLocaleString('vi-VN'),
      current: true,
      active: true,
    }];
  }, []);

  const saveProfile = () => {
    localStorage.setItem(profileStorageKey, JSON.stringify({ ...form, avatarName }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const copyUserId = () => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(userId).then(() => {
      setCopied(userId);
      window.setTimeout(() => setCopied(''), 1300);
    });
  };


  return (
    <div className="profile-page">
      <div className="page-header profile-header">
        <div>
          <h1>Hồ sơ cá nhân</h1>
          <p className="subtitle">
            Quản lý thông tin tài khoản, bảo mật đăng nhập, phiên thiết bị và tuỳ chọn nhận thông báo trong AIGuard.
          </p>
        </div>
        <div className="profile-header-actions">
          <button className="btn-secondary" onClick={copyUserId}>
            <Copy size={14} /> {copied === userId ? 'Đã copy ID' : 'Copy User ID'}
          </button>
          <button className="btn-primary" onClick={saveProfile}>
            <Save size={14} /> {saved ? 'Đã lưu' : 'Lưu hồ sơ'}
          </button>
        </div>
      </div>

      <section className="profile-hero card glass">
        <div className="profile-avatar-block">
          <div className="profile-avatar-xl">{initials}</div>
          <label className="btn-secondary profile-upload">
            <Upload size={14} /> Upload avatar
            <input
              type="file"
              accept="image/*"
              onChange={event => setAvatarName(event.currentTarget.files?.[0]?.name ?? '')}
            />
          </label>
          <span>{avatarName || 'Chưa chọn ảnh đại diện'}</span>
        </div>

        <div className="profile-hero-copy">
          <span className="eyebrow"><User size={14} /> Account Profile</span>
          <h2>{form.fullName}</h2>
          <p>{form.email}</p>
          <div className="profile-badge-row">
            <span><BadgeCheck size={14} /> {role}</span>
            <span><Building2 size={14} /> {form.department}</span>
            <span><ShieldCheck size={14} /> {isActive ? 'Tài khoản đang hoạt động' : 'Tài khoản bị khóa'}</span>
          </div>
        </div>

        <div className="profile-security-summary">
          <strong>Điểm bảo mật</strong>
          <div className="profile-security-score">{mfaEnabled ? '92%' : '68%'}</div>
          <span>{mfaEnabled ? 'MFA đã bật, trạng thái tốt.' : 'Nên bật MFA để tăng bảo mật.'}</span>
        </div>
      </section>

      <section className="profile-grid">
        <div className="card glass profile-panel">
          <PanelTitle icon={<User size={18} />} title="Thông tin cá nhân" />
          <div className="profile-form-grid">
            <label>Họ tên<input value={form.fullName} onChange={event => setForm(previous => ({ ...previous, fullName: event.target.value }))} /></label>
            <label>Email<input value={form.email} onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))} /></label>
            <label>Số điện thoại<input value={form.phone} onChange={event => setForm(previous => ({ ...previous, phone: event.target.value }))} /></label>
            <label>Chức danh<input value={form.jobTitle} onChange={event => setForm(previous => ({ ...previous, jobTitle: event.target.value }))} /></label>
            <label>Phòng ban<input value={form.department} onChange={event => setForm(previous => ({ ...previous, department: event.target.value }))} /></label>
            <label>Múi giờ<select value={form.timezone} onChange={event => setForm(previous => ({ ...previous, timezone: event.target.value }))}><option>Asia/Bangkok</option><option>Asia/Ho_Chi_Minh</option><option>UTC</option></select></label>
          </div>
        </div>

        <div className="card glass profile-panel">
          <PanelTitle icon={<KeyRound size={18} />} title="Bảo mật tài khoản" />
          <div className="profile-security-list">
            <SecurityItem
              icon={<Lock size={17} />}
              title="MFA / Two-factor Authentication"
              description={mfaEnabled ? 'Đã bật MFA cho tài khoản này.' : 'Chưa bật MFA. Tài khoản quản trị nên bật MFA.'}
              state={mfaEnabled ? 'good' : 'warn'}
              action={mfaEnabled ? 'Đã bật' : 'Thiết lập'}
            />
            <SecurityItem
              icon={<ShieldCheck size={17} />}
              title="Auth Provider"
              description={`Nguồn đăng nhập hiện tại: ${authProvider}.`}
              state="good"
              action={authProvider}
            />
            <SecurityItem
              icon={<Mail size={17} />}
              title="Email xác thực"
              description="Email này dùng để nhận cảnh báo bảo mật và approval."
              state="good"
              action="Đã xác thực"
            />
            <SecurityItem
              icon={<AlertTriangle size={17} />}
              title="Đổi mật khẩu"
              description="Nên đổi mật khẩu định kỳ nếu dùng tài khoản Local."
              state="neutral"
              action="Đổi mật khẩu"
            />
          </div>
        </div>
      </section>

      <section className="profile-grid">
        <div className="card glass profile-panel">
          <PanelTitle icon={<Bell size={18} />} title="Tuỳ chọn thông báo" />
          <div className="profile-toggle-list">
            <ToggleRow label="Email cảnh báo rủi ro cao" description="Nhận email khi prompt, file hoặc tool-call bị chặn." checked={form.emailAlerts} onChange={value => setForm(previous => ({ ...previous, emailAlerts: value }))} />
            <ToggleRow label="Thông báo phê duyệt" description="Nhận thông báo khi có yêu cầu approve/reject mới." checked={form.approvalAlerts} onChange={value => setForm(previous => ({ ...previous, approvalAlerts: value }))} />
            <ToggleRow label="Báo cáo tuần" description="Gửi summary tuần theo phòng ban, loại dữ liệu và user rủi ro." checked={form.weeklyReport} onChange={value => setForm(previous => ({ ...previous, weeklyReport: value }))} />
            <ToggleRow label="Tin sản phẩm" description="Nhận thông báo về tính năng mới, roadmap và release note." checked={form.productNews} onChange={value => setForm(previous => ({ ...previous, productNews: value }))} />
          </div>
        </div>

        <div className="card glass profile-panel">
          <PanelTitle icon={<Globe size={18} />} title="Ngôn ngữ & hiển thị" />
          <div className="profile-form-grid single">
            <label>Ngôn ngữ giao diện<select value={form.language} onChange={event => setForm(previous => ({ ...previous, language: event.target.value }))}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>
            <label>Định dạng thời gian<select defaultValue="24h"><option value="24h">24 giờ</option><option value="12h">12 giờ AM/PM</option></select></label>
            <label>Mức dày dữ liệu dashboard<select defaultValue="comfortable"><option value="compact">Gọn</option><option value="comfortable">Dễ đọc</option><option value="detailed">Chi tiết</option></select></label>
          </div>
          <div className="profile-note">
            <Globe size={16} />
            <span>Tuỳ chọn hiển thị được lưu cục bộ theo tài khoản trên trình duyệt này. Khi backend có user preferences API, phần này có thể đồng bộ lên server.</span>
          </div>
        </div>
      </section>

      <section className="profile-grid">
        <div className="card glass profile-panel">
          <PanelTitle icon={<Laptop size={18} />} title="Phiên đăng nhập & thiết bị" />
          <div className="profile-session-list">
            {sessions.map(session => (
              <div className={`profile-session-card ${session.active ? '' : 'revoked'}`} key={session.id}>
                <div className="session-icon">{session.device.toLowerCase().includes('mobile') ? <Smartphone size={18} /> : <Laptop size={18} />}</div>
                <div>
                  <strong>{session.device}</strong>
                  <span>{session.browser} · {session.ip}</span>
                  <small>{session.location} · {session.lastSeen}</small>
                </div>
                <div className="session-actions">
                  <span className={session.active ? 'active' : 'revoked'}>{session.current ? 'Hiện tại' : session.active ? 'Active' : 'Đã thu hồi'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card glass profile-panel">
          <PanelTitle icon={<History size={18} />} title="Hoạt động gần đây" />
          <div className="profile-activity-list">
            {activityLoading && (
              <div>
                <Clock size={14} />
                <div>
                  <strong>Đang tải hoạt động...</strong>
                  <span>Đang đồng bộ từ backend</span>
                </div>
                <time>Now</time>
              </div>
            )}
            {!activityLoading && activityError && (
              <div>
                <AlertTriangle size={14} />
                <div>
                  <strong>Không thể tải hoạt động</strong>
                  <span>{activityError}</span>
                </div>
                <time>-</time>
              </div>
            )}
            {!activityLoading && !activityError && activityEvents.length === 0 && (
              <div>
                <Clock size={14} />
                <div>
                  <strong>Chưa có hoạt động DLP</strong>
                  <span>Khi extension hoặc agent gửi sự kiện, log sẽ xuất hiện tại đây.</span>
                </div>
                <time>-</time>
              </div>
            )}
            {!activityLoading && !activityError && activityEvents.map(event => (
              <div key={event.id}>
                <Clock size={14} />
                <div>
                  <strong>{event.eventType} · {event.decision}</strong>
                  <span>{event.websiteAi || event.hostname} · {event.riskLevel} · {event.dataTypeMatched || 'N/A'}</span>
                </div>
                <time>{new Date(event.createdAt).toLocaleString('vi-VN')}</time>
              </div>
            ))}
          </div>
          <button className="btn-secondary profile-refresh" onClick={loadActivity} disabled={activityLoading}>
            <RefreshCw size={14} /> Làm mới hoạt động
          </button>
        </div>
      </section>

      <section className="card glass profile-danger-zone">
        <div>
          <LogOut size={18} />
          <div>
            <strong>Đăng xuất khỏi AIGuard</strong>
            <span>Đóng phiên hiện tại trên trình duyệt này và yêu cầu backend thu hồi refresh token đang dùng.</span>
          </div>
        </div>
        <button className="btn-secondary" onClick={logout}><LogOut size={14} /> Đăng xuất</button>
      </section>
    </div>
  );
};

const PanelTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="profile-panel-title">
    {icon}
    <h2>{title}</h2>
  </div>
);

interface SecurityItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  state: 'good' | 'warn' | 'neutral';
  action: string;
}

const SecurityItem: React.FC<SecurityItemProps> = ({ icon, title, description, state, action }) => (
  <div className={`profile-security-item ${state}`}>
    <span>{icon}</span>
    <div>
      <strong>{title}</strong>
      <small>{description}</small>
    </div>
    <button type="button">{state === 'good' ? <CheckCircle2 size={13} /> : state === 'warn' ? <AlertTriangle size={13} /> : <XCircle size={13} />} {action}</button>
  </div>
);

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onChange }) => (
  <label className="profile-toggle-row">
    <div>
      <strong>{label}</strong>
      <span>{description}</span>
    </div>
    <span className="switch">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      <span className="slider round" />
    </span>
  </label>
);

export default Profile;
