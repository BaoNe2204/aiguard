import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  History,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  X,
  XCircle
} from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { DecisionBadge } from '../components/ui/DecisionBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Pagination } from '../components/ui/Pagination';
import { useAuth } from '../contexts/AuthContext';
import type { EndpointEventResponse } from '../api/endpoints';
import type { ApprovalResponse } from '../api/approvals';
import { myUsageApi, notificationsApi } from '../api/myUsage';
import { useLanguage } from '../contexts/LanguageContext';

type Tab = 'overview' | 'logs' | 'approvals' | 'summary' | 'notifications';

export const MyUsage: React.FC = () => {
  const location = useLocation();
  const { t, locale } = useLanguage();
  const { user } = useAuth();

  const activeTab = (location.pathname.split('/').pop() || 'overview') as Tab;

  // Personal logs
  const [logs, setLogs] = useState<EndpointEventResponse[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);

  // Personal approvals
  const [approvals, setApprovals] = useState<ApprovalResponse[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    allowed: 0,
    masked: 0,
    blocked: 0,
    pending: 0
  });

  useEffect(() => {
    if (activeTab === 'logs' && user) {
      setLogsLoading(true);
      myUsageApi.getEvents({ page: logsPage, pageSize: 20 })
        .then(result => {
          setLogs(result.items);
          setLogsTotalPages(result.totalPages);
          setLogsTotalCount(result.totalCount);
          // Calculate stats
          const allowed = result.items.filter((l: EndpointEventResponse) => l.decision === 'Allow').length;
          const masked = result.items.filter((l: EndpointEventResponse) => l.decision === 'Mask').length;
          const blocked = result.items.filter((l: EndpointEventResponse) => l.decision === 'Block').length;
          const pending = result.items.filter((l: EndpointEventResponse) => l.decision === 'PendingApproval').length;
          setStats(prev => ({
            ...prev,
            total: result.totalCount,
            allowed: prev.allowed + allowed,
            masked: prev.masked + masked,
            blocked: prev.blocked + blocked,
            pending: prev.pending + pending
          }));
        })
        .catch(() => {})
        .finally(() => setLogsLoading(false));
    } else if (activeTab === 'approvals') {
      setApprovalsLoading(true);
      myUsageApi.getApprovals({ page: 1, pageSize: 20 })
        .then(result => setApprovals(result.items))
        .catch(() => {})
        .finally(() => setApprovalsLoading(false));
    } else if (activeTab === 'notifications') {
      setNotificationsLoading(true);
      notificationsApi.getAll()
        .then(result => setNotifications(result))
        .catch(() => {})
        .finally(() => setNotificationsLoading(false));
    }
  }, [activeTab, logsPage, user]);

  const safetyScore = useMemo(() => {
    if (stats.total === 0) return 100;
    const blockedRatio = stats.blocked / stats.total;
    const maskedRatio = stats.masked / stats.total;
    return Math.max(0, Math.round(100 - (blockedRatio * 50) - (maskedRatio * 10)));
  }, [stats]);

  const tabs = [
    { key: 'overview', label: t('Overview', 'Tổng quan'), icon: <BarChart3 size={16} /> },
    { key: 'logs', label: t('My Logs', 'Nhật ký'), icon: <History size={16} /> },
    { key: 'approvals', label: t('My Requests', 'Yêu cầu'), icon: <CheckCircle2 size={16} /> },
    { key: 'notifications', label: t('Notifications', 'Thông báo'), icon: <Bell size={16} /> },
    { key: 'summary', label: t('Summary', 'Tóm tắt'), icon: <Shield size={16} /> }
  ] as const;

  return (
    <div className="my-usage-page">
      <div className="page-header">
        <div>
          <h1>{t('My Personal Portal', 'Trang cá nhân của tôi')}</h1>
          <p className="subtitle">
            {t('Welcome back', 'Chào mừng trở lại')}, {user?.fullName || 'User'}!
            {' · '}{t('Track your AI usage and security posture', 'Theo dõi hoạt động AI và tình trạng bảo mật của bạn')}
          </p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={() => window.location.reload()}>
          <RefreshCw size={14} /> {t('Refresh', 'Làm mới')}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="usage-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`usage-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => {
              const path = `/app/my-usage/${tab.key}`;
              window.location.href = path;
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Safety Score Card */}
            <div className="usage-hero-card glass">
              <div className="usage-hero-content">
                <div className="usage-hero-icon">
                  {safetyScore >= 80 ? <ShieldCheck size={48} /> : safetyScore >= 50 ? <ShieldAlert size={48} /> : <AlertTriangle size={48} />}
                </div>
                <div className="usage-hero-text">
                  <span className="usage-hero-label">{t('Your Safety Score', 'Điểm an toàn của bạn')}</span>
                  <h2 className={`usage-hero-score ${safetyScore >= 80 ? 'excellent' : safetyScore >= 50 ? 'good' : 'poor'}`}>
                    {safetyScore}/100
                  </h2>
                  <p className="usage-hero-desc">
                    {safetyScore >= 80
                      ? t('Excellent! You maintain safe AI usage habits.', 'Xuất sắc! Bạn duy trì thói quen sử dụng AI an toàn.')
                      : safetyScore >= 50
                        ? t('Good, but there is room for improvement.', 'Khá tốt, nhưng vẫn có chỗ cần cải thiện.')
                        : t('Needs attention. Review your usage patterns.', 'Cần chú ý. Hãy xem lại cách sử dụng của bạn.')
                    }
                  </p>
                </div>
              </div>
              <div className="usage-hero-chart">
                <SafetyScoreChart score={safetyScore} />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="usage-stats-grid">
              <StatCard
                icon={<Activity size={24} />}
                label={t('Total Prompts', 'Tổng Prompt')}
                value={stats.total}
                color="primary"
              />
              <StatCard
                icon={<CheckCircle2 size={24} />}
                label={t('Allowed', 'Được phép')}
                value={stats.allowed}
                color="emerald"
              />
              <StatCard
                icon={<Shield size={24} />}
                label={t('Masked', 'Đã che')}
                value={stats.masked}
                color="sky"
              />
              <StatCard
                icon={<XCircle size={24} />}
                label={t('Blocked', 'Đã chặn')}
                value={stats.blocked}
                color="rose"
              />
              <StatCard
                icon={<Clock size={24} />}
                label={t('Pending', 'Đang chờ')}
                value={stats.pending}
                color="amber"
              />
            </div>

            {/* Quick Actions */}
            <div className="usage-quick-actions glass">
              <h3>{t('Quick Actions', 'Thao tác nhanh')}</h3>
              <div className="quick-actions-grid">
                <button className="quick-action-btn" onClick={() => window.location.href = '/app/my-usage/logs'}>
                  <History size={20} />
                  <span>{t('View My Logs', 'Xem nhật ký')}</span>
                </button>
                <button className="quick-action-btn" onClick={() => window.location.href = '/app/my-usage/approvals'}>
                  <CheckCircle2 size={20} />
                  <span>{t('My Requests', 'Yêu cầu của tôi')}</span>
                </button>
                <button className="quick-action-btn" onClick={() => window.location.href = '/app/my-usage/notifications'}>
                  <Bell size={20} />
                  <span>{t('Notifications', 'Thông báo')}</span>
                </button>
                <button className="quick-action-btn" onClick={() => window.location.href = '/app/profile'}>
                  <FileText size={20} />
                  <span>{t('My Profile', 'Hồ sơ cá nhân')}</span>
                </button>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="usage-privacy glass">
              <ShieldAlert className="usage-privacy-icon" size={20} />
              <div>
                <strong>{t('Your Privacy Matters', 'Quyền riêng tư của bạn được bảo vệ')}</strong>
                <p>{t('AIGuard only monitors content submitted to AI platforms. Your original text is never stored unless required by policy.', 'AIGuard chỉ giám sát nội dung gửi đến nền tảng AI. Văn bản gốc của bạn không được lưu trữ trừ khi chính sách yêu cầu.')}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-tab">
            <div className="usage-section-header glass">
              <h2>{t('My AI Activity Logs', 'Nhật ký hoạt động AI của tôi')}</h2>
              <div className="usage-section-stats">
                <span className="stat-pill emerald">{stats.allowed} {t('Allowed', 'Được phép')}</span>
                <span className="stat-pill sky">{stats.masked} {t('Masked', 'Đã che')}</span>
                <span className="stat-pill rose">{stats.blocked} {t('Blocked', 'Đã chặn')}</span>
              </div>
            </div>
            {logsLoading ? <LoadingSpinner text={t('Loading your logs...', 'Đang tải nhật ký...')} /> : (
              <>
                <div className="card glass">
                  <DataTable
                    data={logs}
                    columns={[
                      { header: t('Time', 'Thời gian'), accessor: (item) => new Date(item.createdAt).toLocaleString(locale), width: '160px' },
                      { header: t('Destination AI', 'AI đích'), accessor: 'websiteAi', width: '150px' },
                      { header: t('Data Detected', 'Dữ liệu phát hiện'), accessor: 'dataTypeMatched', width: '180px' },
                      { header: t('Masked Preview', 'Nội dung đã che'), accessor: (item) => item.maskedContentPreview || '—', width: '200px' },
                      { header: t('Risk', 'Rủi ro'), accessor: (item) => (
                        <span className={`risk-badge ${item.riskLevel?.toLowerCase() || 'low'}`}>
                          {item.riskScore}/100
                        </span>
                      ), width: '80px' },
                      { header: t('Action', 'Xử lý'), accessor: (item) => <DecisionBadge decision={item.decision as any} />, width: '130px' }
                    ]}
                  />
                </div>
                <Pagination page={logsPage} totalPages={logsTotalPages} totalCount={logsTotalCount} pageSize={20} onPageChange={setLogsPage} />
              </>
            )}
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="approvals-tab">
            <div className="usage-section-header glass">
              <h2>{t('My Approval Requests', 'Yêu cầu phê duyệt của tôi')}</h2>
            </div>
            {approvalsLoading ? <LoadingSpinner text={t('Loading approvals...', 'Đang tải yêu cầu...')} /> : (
              <div className="card glass">
                {approvals.length === 0 ? (
                  <div className="usage-empty-state">
                    <CheckCircle2 size={48} className="text-emerald-400" />
                    <p>{t('No pending requests', 'Không có yêu cầu nào đang chờ')}</p>
                  </div>
                ) : (
                  <DataTable
                    data={approvals}
                    columns={[
                      { header: t('Type', 'Loại'), accessor: 'requestType', width: '120px' },
                      { header: t('Time', 'Thời gian'), accessor: (item) => new Date(item.createdAt).toLocaleString(locale), width: '160px' },
                      { header: t('Summary', 'Tóm tắt'), accessor: (item) => item.eventSummary || item.dataTypeMatched || '—', width: '250px' },
                      { header: t('Reviewer', 'Người duyệt'), accessor: (item) => item.assignedApproverName || '—', width: '150px' },
                      { header: t('Status', 'Trạng thái'), accessor: (item) => (
                        <span className={`status-badge ${item.status?.toLowerCase() || 'pending'}`}>
                          {item.status === 'Pending' ? t('Pending', 'Đang chờ') :
                           item.status === 'Approved' ? t('Approved', 'Đã duyệt') :
                           item.status === 'ApprovedWithMasking' ? t('Masked & Approved', 'Che & Duyệt') :
                           t('Rejected', 'Từ chối')}
                        </span>
                      ), width: '150px' }
                    ]}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notifications-tab">
            <div className="usage-section-header glass">
              <h2>{t('My Notifications', 'Thông báo của tôi')}</h2>
              <button className="btn-secondary text-sm" onClick={() => {
                notifications.filter(n => !n.isRead).forEach(n => {
                  notificationsApi.markRead(n.id).catch(() => {});
                });
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
              }}>
                {t('Mark all read', 'Đánh dấu đã đọc')}
              </button>
            </div>
            {notificationsLoading ? <LoadingSpinner text={t('Loading notifications...', 'Đang tải thông báo...')} /> : (
              <div className="card glass notifications-list">
                {notifications.length === 0 ? (
                  <div className="usage-empty-state">
                    <Bell size={48} className="text-zinc-500" />
                    <p>{t('No notifications', 'Không có thông báo nào')}</p>
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div key={notif.id || idx} className={`notification-item ${notif.isRead ? '' : 'unread'}`}>
                      <div className="notification-icon">
                        {notif.type === 'ApprovalDecided' ? <CheckCircle2 size={18} /> :
                         notif.type === 'FalsePositiveDecision' ? <ShieldCheck size={18} /> :
                         notif.type === 'IncidentAlert' ? <AlertTriangle size={18} /> :
                         <Bell size={18} />}
                      </div>
                      <div className="notification-content">
                        <strong>{notif.title}</strong>
                        <p>{notif.message}</p>
                        <time>{new Date(notif.createdAt).toLocaleString(locale)}</time>
                      </div>
                      {!notif.isRead && (
                        <button className="notification-dismiss" onClick={() => {
                          notificationsApi.markRead(notif.id).catch(() => {});
                          setNotifications(prev => prev.filter((_, i) => i !== idx));
                        }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="summary-tab">
            <div className="usage-section-header glass">
              <h2>{t('Usage Summary & Security Report', 'Báo cáo sử dụng và bảo mật')}</h2>
              <button className="btn-secondary text-sm flex items-center gap-2">
                <Download size={14} /> {t('Export Report', 'Xuất báo cáo')}
              </button>
            </div>

            {/* Summary Stats */}
            <div className="usage-summary-grid">
              <div className="summary-card glass">
                <h3><TrendingUp size={18} /> {t('Activity Overview', 'Tổng quan hoạt động')}</h3>
                <div className="summary-stats">
                  <div className="summary-stat-row">
                    <span>{t('Total prompts checked', 'Tổng prompt đã kiểm tra')}</span>
                    <strong>{logsTotalCount}</strong>
                  </div>
                  <div className="summary-stat-row success">
                    <span>{t('Safe interactions', 'Tương tác an toàn')}</span>
                    <strong>{stats.allowed}</strong>
                  </div>
                  <div className="summary-stat-row warning">
                    <span>{t('Content masked', 'Nội dung đã che')}</span>
                    <strong>{stats.masked}</strong>
                  </div>
                  <div className="summary-stat-row danger">
                    <span>{t('Blocked attempts', 'Nỗ lực bị chặn')}</span>
                    <strong>{stats.blocked}</strong>
                  </div>
                </div>
              </div>

              <div className="summary-card glass">
                <h3><ShieldCheck size={18} /> {t('Safety Score Breakdown', 'Chi tiết điểm an toàn')}</h3>
                <div className="safety-breakdown">
                  <div className="safety-factor">
                    <div className="safety-factor-header">
                      <span>{t('Risk Avoidance', 'Tránh rủi ro')}</span>
                      <span className="text-emerald-400">{100 - Math.round(stats.blocked / Math.max(stats.total, 1) * 100)}%</span>
                    </div>
                    <div className="safety-factor-bar">
                      <div className="safety-factor-fill emerald" style={{ width: `${100 - Math.round(stats.blocked / Math.max(stats.total, 1) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="safety-factor">
                    <div className="safety-factor-header">
                      <span>{t('Data Protection', 'Bảo vệ dữ liệu')}</span>
                      <span className="text-sky-400">{100 - Math.round(stats.masked / Math.max(stats.total, 1) * 20)}%</span>
                    </div>
                    <div className="safety-factor-bar">
                      <div className="safety-factor-fill sky" style={{ width: `${100 - Math.round(stats.masked / Math.max(stats.total, 1) * 20)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="safety-recommendation">
                  {safetyScore >= 80 ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>{t('Great job! Continue maintaining your safe AI usage habits.', 'Tuyệt vời! Hãy tiếp tục duy trì thói quen sử dụng AI an toàn.')}</span>
                    </>
                  ) : safetyScore >= 50 ? (
                    <>
                      <AlertTriangle size={16} className="text-amber-400" />
                      <span>{t('Review sensitive data handling. Avoid sending confidential information to AI platforms.', 'Hãy xem lại cách xử lý dữ liệu nhạy cảm. Tránh gửi thông tin bí mật đến nền tảng AI.')}</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} className="text-rose-400" />
                      <span>{t('Immediate attention needed. Contact your administrator for guidance.', 'Cần chú ý ngay. Liên hệ quản trị viên để được hướng dẫn.')}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="summary-card glass">
                <h3><Shield size={18} /> {t('Privacy Commitment', 'Cam kết quyền riêng tư')}</h3>
                <div className="privacy-list">
                  <div className="privacy-item">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>{t('Your original text is never sent to external servers', 'Văn bản gốc không bao giờ được gửi đến máy chủ bên ngoài')}</span>
                  </div>
                  <div className="privacy-item">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>{t('Data is only stored when required by company policy', 'Dữ liệu chỉ được lưu khi chính sách công ty yêu cầu')}</span>
                  </div>
                  <div className="privacy-item">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>{t('All activity logs are encrypted at rest', 'Nhật ký hoạt động được mã hóa khi lưu trữ')}</span>
                  </div>
                  <div className="privacy-item">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>{t('Access is limited to you and authorized administrators', 'Quyền truy cập chỉ giới hạn cho bạn và quản trị viên được ủy quyền')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-components
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'primary' | 'emerald' | 'sky' | 'rose' | 'amber';
}> = ({ icon, label, value, color }) => (
  <div className={`stat-card glass ${color}`}>
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-content">
      <span className="stat-card-label">{label}</span>
      <strong className="stat-card-value">{value.toLocaleString()}</strong>
    </div>
  </div>
);

const SafetyScoreChart: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';

  return (
    <svg className="safety-score-ring" viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="8"
      />
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="50" y="50" textAnchor="middle" dy="0.3em" fill={color} fontSize="16" fontWeight="bold">
        {score}
      </text>
    </svg>
  );
};

export default MyUsage;
