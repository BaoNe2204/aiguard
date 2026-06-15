import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Cpu,
  Database,
  Download,
  Laptop,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { dashboardApi, type DashboardStats, type DepartmentRisk } from '../api/dashboard';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deptRisks, setDeptRisks] = useState<DepartmentRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, riskData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getDepartmentRisk(),
        ]);
        setStats(statsData);
        setDeptRisks(riskData);
      } catch (err: any) {
        setError(err.message || t('Failed to load dashboard data', 'Không thể tải dữ liệu tổng quan'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [t]);

  // Calculate overall health score
  const healthScore = useMemo(() => {
    if (!stats) return 0;
    const onlineRatio = stats.activeProtectedDevices / Math.max(stats.activeProtectedDevices + stats.failedBlockchainBatches, 1);
    const securityRatio = 1 - (stats.blockedIncidents / Math.max(stats.totalPromptsChecked, 1));
    return Math.round((onlineRatio * 0.4 + securityRatio * 0.6) * 100);
  }, [stats]);

  // Calculate trend
  const trend = useMemo(() => {
    if (!stats) return { direction: 'up' as const, percentage: 0 };
    // Mock trend data
    return { direction: 'up' as const, percentage: 12 };
  }, [stats]);

  if (loading) {
    return (
      <div className="dashboard-page flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <LoadingSpinner size="lg" text={t('Loading dashboard...', 'Đang tải tổng quan...')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="card glass p-6 text-center">
          <AlertTriangle className="text-rose-400 mx-auto mb-2" size={32} />
          <p className="text-rose-400">{error}</p>
        </div>
      </div>
    );
  }

  const isTenantOwner = user?.role === 'TenantOwner' || user?.role === 'PlatformAdmin';

  return (
    <div className="dashboard-page">
      <div className="page-header dashboard-header">
        <div>
          <div className="dashboard-eyebrow">
            <BarChart3 size={16} />
            {isTenantOwner ? t('Tenant Overview', 'Tổng quan Doanh nghiệp') : t('Security Overview', 'Tổng quan Bảo mật')}
          </div>
          <h1>{isTenantOwner ? t('Enterprise Control Tower', 'Trung tâm kiểm soát Doanh nghiệp') : t('Security Dashboard', 'Bảng điều khiển Bảo mật')}</h1>
          <p className="subtitle">{t('Real-time DLP monitoring and AI Agent protection statistics', 'Thống kê giám sát DLP và bảo vệ AI Agent theo thời gian thực')}</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn-secondary flex items-center gap-2" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> {t('Refresh', 'Làm mới')}
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Download size={14} /> {t('Export Report', 'Xuất báo cáo')}
          </button>
        </div>
      </div>

      {/* Health Overview Hero */}
      <div className="dashboard-hero glass">
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-icon">
            {healthScore >= 80 ? <ShieldCheck size={40} /> : healthScore >= 50 ? <Shield size={40} /> : <ShieldAlert size={40} />}
          </div>
          <div className="dashboard-hero-text">
            <span className="dashboard-hero-label">{t('System Health', 'Tình trạng hệ thống')}</span>
            <h2 className={`dashboard-hero-score ${healthScore >= 80 ? 'excellent' : healthScore >= 50 ? 'good' : 'poor'}`}>
              {healthScore}%
            </h2>
            <p className="dashboard-hero-desc">
              {healthScore >= 80
                ? t('All systems operational. No critical issues detected.', 'Tất cả hệ thống hoạt động tốt. Không có vấn đề nghiêm trọng.')
                : healthScore >= 50
                  ? t('System partially operational. Some attention required.', 'Hệ thống hoạt động một phần. Cần chú ý một số mục.')
                  : t('Critical issues detected. Immediate action recommended.', 'Phát hiện vấn đề nghiêm trọng. Khuyến nghị hành động ngay.')
              }
            </p>
          </div>
        </div>
        <div className="dashboard-hero-chart">
          <HealthRing score={healthScore} />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KpiCard
          icon={<ShieldAlert className="text-rose-400" size={24} />}
          title={t('Blocked Incidents', 'Sự cố đã chặn')}
          value={stats?.blockedIncidents ?? 0}
          trend={stats?.blockedIncidents ? -5 : 0}
          color="rose"
        />
        <KpiCard
          icon={<ShieldCheck className="text-emerald-400" size={24} />}
          title={t('Masked Detections', 'Dữ liệu đã che')}
          value={stats?.maskedDetections ?? 0}
          trend={8}
          color="emerald"
        />
        <KpiCard
          icon={<Cpu className="text-indigo-400" size={24} />}
          title={t('Pending Approvals', 'Đang chờ phê duyệt')}
          value={stats?.pendingApprovals ?? 0}
          trend={0}
          color="amber"
        />
        <KpiCard
          icon={<Laptop className="text-sky-400" size={24} />}
          title={t('Protected Devices', 'Thiết bị được bảo vệ')}
          value={stats?.activeProtectedDevices ?? 0}
          trend={3}
          color="sky"
        />
        <KpiCard
          icon={<Activity className="text-violet-400" size={24} />}
          title={t('Extension Active', 'Tiện ích hoạt động')}
          value={stats?.extensionActiveCount ?? 0}
          trend={5}
          color="violet"
        />
        <KpiCard
          icon={<Database className="text-orange-400" size={24} />}
          title={t('Failed Batches', 'Lô neo thất bại')}
          value={stats?.failedBlockchainBatches ?? 0}
          trend={stats?.failedBlockchainBatches ? -2 : 0}
          color="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Department Risk Table */}
        <div className="card glass" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-indigo-400" />
              <h2>{t('Department Risk Statistics', 'Thống kê rủi ro theo phòng ban')}</h2>
            </div>
            <button className="btn-link">{t('View all', 'Xem tất cả')} <ArrowRight size={14} /></button>
          </div>
          {deptRisks.length > 0 ? (
            <DataTable
              data={deptRisks}
              columns={[
                { header: t('Department', 'Phòng ban'), accessor: 'departmentName' },
                { header: t('Users', 'Người dùng'), accessor: 'userCount', width: '90px' },
                { header: t('Total Prompts', 'Tổng prompt'), accessor: 'totalPrompts', width: '110px' },
                { header: t('Masked', 'Đã che'), accessor: 'maskedCount', width: '80px' },
                { header: t('Blocked', 'Đã chặn'), accessor: 'blockedCount', width: '90px' },
                { header: t('Avg Risk', 'Rủi ro TB'), accessor: (item) => (
                  <div className="flex items-center gap-2">
                    <div className="risk-progress-bg">
                      <div className="risk-progress-bar" style={{ width: `${item.avgRiskScore}%`, backgroundColor: item.avgRiskScore > 50 ? '#fb7185' : '#fbbf24' }}></div>
                    </div>
                    <span className="text-xs font-semibold">{Math.round(item.avgRiskScore)}%</span>
                  </div>
                ), width: '130px' },
                { header: t('Top violation', 'Vi phạm phổ biến'), accessor: 'topDataType' }
              ]}
            />
          ) : (
            <div className="p-6 text-center text-zinc-500">{t('No department risk data available', 'Chưa có dữ liệu rủi ro phòng ban')}</div>
          )}
        </div>

        {/* Quick Actions Panel */}
        {isTenantOwner && (
          <div className="card glass dashboard-quick-actions">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-amber-400" />
                <h2>{t('Quick Actions', 'Thao tác nhanh')}</h2>
              </div>
            </div>
            <div className="quick-actions-list">
              <QuickAction
                icon={<Users size={20} />}
                title={t('Manage Users', 'Quản lý người dùng')}
                description={t('Add, edit, or disable user accounts', 'Thêm, chỉnh sửa, hoặc vô hiệu tài khoản')}
                href="/app/governance/identity"
              />
              <QuickAction
                icon={<Shield size={20} />}
                title={t('Security Policies', 'Chính sách bảo mật')}
                description={t('Configure DLP rules and detectors', 'Cấu hình luật DLP và bộ phát hiện')}
                href="/app/policies/rules"
              />
              <QuickAction
                icon={<Laptop size={20} />}
                title={t('Deploy Agents', 'Triển khai Agent')}
                description={t('Install protection on new devices', 'Cài đặt bảo vệ trên thiết bị mới')}
                href="/app/endpoints/deployment"
              />
              <QuickAction
                icon={<BarChart3 size={20} />}
                title={t('View Audit Logs', 'Xem nhật ký kiểm toán')}
                description={t('Review system activity and compliance', 'Xem lại hoạt động hệ thống và tuân thủ')}
                href="/app/audit/logs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="dashboard-summary glass">
        <div className="summary-item">
          <TrendingUp size={20} className="text-emerald-400" />
          <div>
            <span className="summary-label">{t('This month trend', 'Xu hướng tháng này')}</span>
            <strong className="summary-value positive">+{trend.percentage}%</strong>
          </div>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-item">
          <ShieldCheck size={20} className="text-sky-400" />
          <div>
            <span className="summary-label">{t('DLP Active', 'DLP đang hoạt động')}</span>
            <strong className="summary-value">{stats?.extensionActiveCount ?? 0} {t('endpoints', 'thiết bị')}</strong>
          </div>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-item">
          <AlertTriangle size={20} className="text-amber-400" />
          <div>
            <span className="summary-label">{t('Pending approvals', 'Phê duyệt đang chờ')}</span>
            <strong className="summary-value">{stats?.pendingApprovals ?? 0}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components
interface KpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  trend: number;
  color: 'rose' | 'emerald' | 'amber' | 'sky' | 'violet' | 'orange';
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, title, value, trend, color }) => {
  const { t } = useLanguage();
  const colorMap = {
    rose: { bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.2)', text: '#fca5a5' },
    emerald: { bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.2)', text: '#6ee7b7' },
    amber: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.2)', text: '#fcd34d' },
    sky: { bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.2)', text: '#7dd3fc' },
    violet: { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa' },
    orange: { bg: 'rgba(251, 146, 60, 0.1)', border: 'rgba(251, 146, 60, 0.2)', text: '#fb923c' },
  };

  const colors = colorMap[color];

  return (
    <div className="kpi-card glass">
      <div className="kpi-card-main">
        <div>
          <span className="kpi-title">{title}</span>
          <span className="kpi-value">{value.toLocaleString()}</span>
        </div>
        <div className="kpi-icon-wrapper" style={{ background: colors.bg, color: colors.text }}>
          {icon}
        </div>
      </div>
      {trend !== 0 && (
        <div className="kpi-trend" style={{ color: trend > 0 ? '#6ee7b7' : '#fca5a5' }}>
          {trend > 0 ? <TrendingUp size={12} /> : <ArrowRight size={12} style={{ transform: 'rotate(90deg)' }} />}
          {Math.abs(trend)}% {t('vs last week', 'so với tuần trước')}
        </div>
      )}
    </div>
  );
};

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, title, description, href }) => (
  <a href={href} className="quick-action-item">
    <div className="quick-action-icon">{icon}</div>
    <div className="quick-action-text">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
    <ArrowRight size={16} className="quick-action-arrow" />
  </a>
);

const HealthRing: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';

  return (
    <svg className="health-ring" viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="6"
      />
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="50" y="50" textAnchor="middle" dy="0.3em" fill={color} fontSize="18" fontWeight="bold">
        {score}%
      </text>
    </svg>
  );
};

export default Dashboard;
