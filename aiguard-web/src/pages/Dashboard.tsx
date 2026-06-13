import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Laptop,
  Cpu,
  ArrowRight,
  ClipboardCheck,
  Database,
  AlertTriangle
} from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { dashboardApi, type DashboardStats, type DepartmentRisk } from '../api/dashboard';
import { useLanguage } from '../contexts/LanguageContext';

export const Dashboard: React.FC = () => {
  const { t, locale } = useLanguage();
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
  }, []);

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

  const kpis = [
    { title: t('Protected Devices', 'Thiết bị được bảo vệ'), value: stats?.activeProtectedDevices ?? 0, icon: <Laptop className="text-sky-400" size={24} />, desc: t('Active Desktop Agents', 'Desktop Agent đang hoạt động') },
    { title: t('Blocked Incidents', 'Sự cố đã chặn'), value: stats?.blockedIncidents ?? 0, icon: <ShieldAlert className="text-rose-400 animate-pulse" size={24} />, desc: t('Critical threats intercepted', 'Mối đe dọa nghiêm trọng đã ngăn chặn') },
    { title: t('Masked Detections', 'Dữ liệu đã che'), value: stats?.maskedDetections ?? 0, icon: <ShieldCheck className="text-emerald-400" size={24} />, desc: t('Sensitive data hidden', 'Dữ liệu nhạy cảm đã được ẩn') },
    { title: t('Pending Approvals', 'Đang chờ phê duyệt'), value: stats?.pendingApprovals ?? 0, icon: <ClipboardCheck className="text-amber-400" size={24} />, desc: t('Awaiting manager review', 'Đang chờ quản lý xem xét') },
    { title: t('Extension Active', 'Tiện ích đang hoạt động'), value: stats?.extensionActiveCount ?? 0, icon: <Cpu className="text-indigo-400" size={24} />, desc: t('Browsers running DLP', 'Trình duyệt đang chạy DLP') },
    { title: t('Failed Batches', 'Lô neo thất bại'), value: stats?.failedBlockchainBatches ?? 0, icon: <Database className="text-orange-400" size={24} />, desc: t('Blockchain anchor issues', 'Lỗi neo dữ liệu Blockchain') },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>{t('Security Dashboard Overview', 'Tổng quan an toàn hệ thống')}</h1>
          <p className="subtitle">{t('Realtime endpoint DLP logs and AI Agent monitoring statistics', 'Nhật ký DLP thiết bị và thống kê giám sát AI Agent theo thời gian thực')}</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        {kpis.map((kpi, index) => (
          <div key={index} className="kpi-card glass">
            <div className="kpi-card-main">
              <div>
                <span className="kpi-title">{kpi.title}</span>
                <span className="kpi-value">{kpi.value.toLocaleString(locale)}</span>
              </div>
              <div className="kpi-icon-wrapper">{kpi.icon}</div>
            </div>
            <span className="kpi-desc">{kpi.desc}</span>
          </div>
        ))}
      </div>

      {/* Department Risk */}
      <div className="dashboard-grid">
        <div className="card glass" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h2>{t('Department Risk Statistics', 'Thống kê rủi ro theo phòng ban')}</h2>
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
      </div>
    </div>
  );
};
export default Dashboard;
