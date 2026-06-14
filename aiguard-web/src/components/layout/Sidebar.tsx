import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Cpu,
  Headphones,
  History,
  KeyRound,
  Laptop,
  LayoutDashboard,
  Lock,
  LogOut,
  PackageCheck,
  ReceiptText,
  Rocket,
  Settings,
  Shield,
  User,
  Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarItem {
  key: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { title: string; path: string }[];
}

const ROLE_LABELS: Record<string, string> = {
  PlatformAdmin: 'Quản trị nền tảng',
  TenantOwner: 'Chủ doanh nghiệp',
  SecurityAdmin: 'Quản trị bảo mật',
  DepartmentManager: 'Trưởng phòng ban',
  Employee: 'Nhân viên'
};

const defaultOpenMenus: Record<string, boolean> = {
  business: true,
  endpoints: true,
  approvals: true,
  policies: true,
  agents: false,
  audit: false,
  governance: false,
  myUsage: true
};

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(defaultOpenMenus);

  const toggleMenu = (key: string) => {
    setOpenMenus((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const menuItems = useMemo<SidebarItem[]>(() => {
    switch (user?.role) {
      case 'PlatformAdmin':
        return [
          { key: 'platform_dashboard', title: 'Tổng quan SaaS', description: 'Sức khỏe nền tảng', icon: <LayoutDashboard size={18} />, path: '/app/business/operations' },
          { key: 'platform_customers', title: 'Khách hàng', description: 'Tenant và chủ sở hữu', icon: <Building2 size={18} />, path: '/app/business/customers' },
          { key: 'platform_packages', title: 'Gói bán', description: 'Plan, giá và giới hạn', icon: <PackageCheck size={18} />, path: '/app/business/packages' },
          { key: 'platform_orders', title: 'Đơn hàng', description: 'Duyệt và cấp license', icon: <ClipboardList size={18} />, path: '/app/business/orders' },
          { key: 'platform_licenses', title: 'License', description: 'Khóa, gia hạn, giới hạn', icon: <KeyRound size={18} />, path: '/app/business/licenses' },
          { key: 'platform_invoices', title: 'Hóa đơn', description: 'Thanh toán và biên lai', icon: <ReceiptText size={18} />, path: '/app/business/invoices' },
          { key: 'platform_support', title: 'Hỗ trợ', description: 'Ticket triển khai', icon: <Headphones size={18} />, path: '/app/business/support' }
        ];
      case 'TenantOwner':
        return [
          {
            key: 'business',
            title: 'Doanh nghiệp của tôi',
            description: 'Mua gói và vận hành tenant',
            icon: <Briefcase size={18} />,
            subItems: [
              { title: 'Onboarding', path: '/app/business/onboarding' },
              { title: 'Gói dịch vụ', path: '/app/business/packages' },
              { title: 'Xác nhận thanh toán', path: '/app/business/payment' },
              { title: 'Đơn hàng', path: '/app/business/orders' },
              { title: 'License', path: '/app/business/licenses' },
              { title: 'Cấu hình công ty', path: '/app/business/company' },
              { title: 'Hỗ trợ', path: '/app/business/support' }
            ]
          },
          {
            key: 'governance',
            title: 'Quản trị doanh nghiệp',
            description: 'Người dùng và thiết lập',
            icon: <Settings size={18} />,
            subItems: [
              { title: 'Người dùng & phòng ban', path: '/app/governance/identity' },
              { title: 'Sức khỏe hệ thống', path: '/app/governance/health' },
              { title: 'Lưu trữ & SIEM', path: '/app/governance/settings' }
            ]
          },
          { key: 'deployment', title: 'Triển khai thiết bị', description: 'Token cài đặt agent', icon: <Rocket size={18} />, path: '/app/endpoints/deployment' },
          { key: 'profile', title: 'Hồ sơ tài khoản', description: 'Bảo mật đăng nhập', icon: <User size={18} />, path: '/app/profile' }
        ];
      case 'SecurityAdmin':
        return [
          { key: 'dashboard', title: 'Tổng quan bảo mật', description: 'Rủi ro và DLP', icon: <LayoutDashboard size={18} />, path: '/app/dashboard' },
          {
            key: 'endpoints',
            title: 'Bảo vệ thiết bị',
            description: 'Máy trạm, log và website AI',
            icon: <Laptop size={18} />,
            subItems: [
              { title: 'Thiết bị', path: '/app/endpoints/devices' },
              { title: 'Nhật ký DLP', path: '/app/endpoints/events' },
              { title: 'Website AI', path: '/app/endpoints/ai-websites' }
            ]
          },
          {
            key: 'policies',
            title: 'Chính sách bảo mật',
            description: 'Luật chặn và bộ phát hiện',
            icon: <Lock size={18} />,
            subItems: [
              { title: 'Quy tắc phòng ban', path: '/app/policies/rules' },
              { title: 'Bộ phát hiện', path: '/app/policies/detectors' },
              { title: 'Whitelist & Blacklist', path: '/app/policies/whitelist-blacklist' },
              { title: 'Phiên bản chính sách', path: '/app/policies/versions' }
            ]
          },
          {
            key: 'approvals',
            title: 'Trung tâm phê duyệt',
            description: 'Prompt, file và agent',
            icon: <CheckSquare size={18} />,
            subItems: [
              { title: 'Duyệt prompt', path: '/app/approvals/prompts' },
              { title: 'Duyệt Agent', path: '/app/approvals/agents' },
              { title: 'Lịch sử phê duyệt', path: '/app/approvals/history' }
            ]
          },
          {
            key: 'agents',
            title: 'Kiểm soát AI Agent',
            description: 'Quyền tool-call và runtime',
            icon: <Cpu size={18} />,
            subItems: [
              { title: 'Danh sách Agent', path: '/app/agents' },
              { title: 'Quyền công cụ', path: '/app/agents/permissions' },
              { title: 'Giám sát tool-call', path: '/app/agents/monitor' },
              { title: 'Prompt injection', path: '/app/agents/prompt-injection' },
              { title: 'Mô phỏng chính sách', path: '/app/agents/simulation' },
              { title: 'Runtime controls', path: '/app/agents/runtime' },
              { title: 'Red-team tests', path: '/app/agents/red-team' }
            ]
          },
          {
            key: 'governance',
            title: 'Quản trị bảo mật',
            description: 'Sự cố và cảnh báo',
            icon: <Settings size={18} />,
            subItems: [
              { title: 'Sức khỏe hệ thống', path: '/app/governance/health' },
              { title: 'Chặn nhầm', path: '/app/governance/false-positives' },
              { title: 'Sự cố', path: '/app/governance/incidents' },
              { title: 'Policy Builder', path: '/app/governance/rules' }
            ]
          },
          {
            key: 'audit',
            title: 'Kiểm toán',
            description: 'Audit log và blockchain',
            icon: <History size={18} />,
            subItems: [
              { title: 'Nhật ký kiểm toán', path: '/app/audit/logs' },
              { title: 'Lô neo Blockchain', path: '/app/blockchain/batches' }
            ]
          }
        ];
      case 'DepartmentManager':
        return [
          { key: 'dashboard', title: 'Tổng quan phòng ban', description: 'Log và rủi ro đội nhóm', icon: <LayoutDashboard size={18} />, path: '/app/dashboard' },
          { key: 'events', title: 'Log nhân viên', description: 'DLP trong phòng ban', icon: <Users size={18} />, path: '/app/endpoints/events' },
          {
            key: 'approvals',
            title: 'Phê duyệt của phòng ban',
            description: 'Yêu cầu từ cấp dưới',
            icon: <CheckSquare size={18} />,
            subItems: [
              { title: 'Duyệt prompt', path: '/app/approvals/prompts' },
              { title: 'Duyệt Agent', path: '/app/approvals/agents' },
              { title: 'Lịch sử phê duyệt', path: '/app/approvals/history' }
            ]
          },
          { key: 'incidents', title: 'Sự cố phòng ban', description: 'Theo dõi vụ việc', icon: <Shield size={18} />, path: '/app/governance/incidents' },
          { key: 'myUsage', title: 'Hoạt động của tôi', description: 'Log cá nhân', icon: <User size={18} />, path: '/app/my-usage/logs' }
        ];
      case 'Employee':
      default:
        return [
          { key: 'my_logs', title: 'Nhật ký của tôi', description: 'Lịch sử sử dụng AI', icon: <History size={18} />, path: '/app/my-usage/logs' },
          { key: 'my_requests', title: 'Yêu cầu của tôi', description: 'Theo dõi phê duyệt', icon: <CheckSquare size={18} />, path: '/app/my-usage/approvals' },
          { key: 'my_score', title: 'Điểm an toàn', description: 'Thói quen bảo mật', icon: <BadgeCheck size={18} />, path: '/app/my-usage/summary' },
          { key: 'profile', title: 'Hồ sơ cá nhân', description: 'Thông tin tài khoản', icon: <User size={18} />, path: '/app/profile' }
        ];
    }
  }, [user?.role]);

  const userInitials = user?.fullName
    ? user.fullName.split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase()
    : 'AG';
  const roleLabel = ROLE_LABELS[user?.role || ''] || 'Người dùng';
  const tenantLabel = localStorage.getItem('aiguard_tenant_code') || user?.departmentName || 'AIGuard Platform';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <Shield className="logo-icon" size={24} />
          <span className="logo-text">AIGuard</span>
        </div>
        <span className="logo-subtitle">Control Tower</span>
      </div>

      <div className="sidebar-role-card">
        <span className="role-eyebrow">Không gian làm việc</span>
        <strong>{roleLabel}</strong>
        <small>{tenantLabel}</small>
      </div>

      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        {menuItems.map((item) => {
          if (item.path) {
            return (
              <NavLink key={item.key} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-item-main">
                  {item.icon}
                  <span>
                    <span className="nav-text">{item.title}</span>
                    {item.description && <span className="nav-description">{item.description}</span>}
                  </span>
                </span>
              </NavLink>
            );
          }

          const isOpen = openMenus[item.key];
          return (
            <div key={item.key} className="nav-group">
              <button className="nav-group-trigger" onClick={() => toggleMenu(item.key)}>
                <span className="nav-item-main">
                  {item.icon}
                  <span>
                    <span className="nav-text">{item.title}</span>
                    {item.description && <span className="nav-description">{item.description}</span>}
                  </span>
                </span>
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>

              {isOpen && (
                <div className="nav-sub-items">
                  {item.subItems?.map((subItem) => (
                    <NavLink key={subItem.path} to={subItem.path} className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}>
                      {subItem.title}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-info">
            <span className="user-name">{user?.fullName || 'AIGuard User'}</span>
            <span className="user-role">{roleLabel}</span>
          </div>
        </div>
        <button className="btn-logout" onClick={logout} title="Đăng xuất">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
