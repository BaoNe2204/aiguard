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
  PackageCheck,
  ReceiptText,
  Settings,
  Shield,
  User,
  Users,
  LogOut
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

  const rawMenuItems = useMemo<SidebarItem[]>(() => {
    switch (user?.role) {
      case 'PlatformAdmin':
        return [
          { key: 'platform_dashboard', title: 'Tổng quan SaaS', description: 'Sức khỏe nền tảng', icon: <LayoutDashboard size={18} />, path: '/app/business/operations' },
          { key: 'platform_customers', title: 'Khách hàng', description: 'Tenant và chủ sở hữu', icon: <Building2 size={18} />, path: '/app/business/customers' },
          { key: 'platform_onboarding', title: 'Trial / Onboarding', description: 'Checklist triển khai khách hàng', icon: <CheckSquare size={18} />, path: '/app/business/onboarding' },
          { key: 'platform_packages', title: 'Gói bán', description: 'Plan, giá và giới hạn', icon: <PackageCheck size={18} />, path: '/app/business/packages' },
          { key: 'platform_orders', title: 'Đơn hàng', description: 'Tất cả đơn hàng hệ thống', icon: <ClipboardList size={18} />, path: '/app/business/orders' },
          { key: 'platform_payments', title: 'Thanh toán', description: 'Lịch sử giao dịch toàn nền tảng', icon: <ReceiptText size={18} />, path: '/app/business/payments' },
          { key: 'platform_licenses', title: 'License', description: 'Khóa, gia hạn, giới hạn', icon: <KeyRound size={18} />, path: '/app/business/licenses' },
          { key: 'platform_invoices', title: 'Hóa đơn', description: 'Thanh toán và biên lai', icon: <ReceiptText size={18} />, path: '/app/business/invoices' },
          { key: 'platform_support', title: 'Hỗ trợ', description: 'Ticket triển khai', icon: <Headphones size={18} />, path: '/app/business/support' }
          ,
          { key: 'agent_lab', title: 'AI Agent Lab', description: 'Dev/test tam thoi', icon: <Cpu size={18} />, path: '/app/dev/ai-agent-lab' }
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
              { title: 'Gói & Subscription', path: '/app/business/subscriptions' },
              { title: 'Đơn hàng', path: '/app/business/orders' },
              { title: 'Lịch sử thanh toán', path: '/app/business/payments' },
              { title: 'License', path: '/app/business/licenses' },
              { title: 'Báo giá & Hợp đồng', path: '/app/business/quotations' },
              { title: 'Cấu hình công ty', path: '/app/business/company' },
              { title: 'Hỗ trợ', path: '/app/business/support' }
            ]
          },
          {
            key: 'governance',
            title: 'Quản trị doanh nghiệp',
            description: 'Người dùng, sự cố và tích hợp',
            icon: <Settings size={18} />,
            subItems: [
              { title: 'Sức khỏe hệ thống', path: '/app/governance/health' },
              { title: 'Người dùng & phòng ban', path: '/app/governance/identity' },
              { title: 'Chặn nhầm', path: '/app/governance/false-positives' },
              { title: 'Sự cố', path: '/app/governance/incidents' },
              { title: 'Policy Rule Builder', path: '/app/governance/rules' },
              { title: 'Lưu trữ & SIEM', path: '/app/governance/settings' }
            ]
          },
          {
            key: 'endpoints',
            title: 'Bảo vệ thiết bị',
            description: 'Trạng thái hoạt động thiết bị',
            icon: <Laptop size={18} />,
            subItems: [
              { title: 'Thiết bị đã triển khai', path: '/app/endpoints/devices' },
              { title: 'Cài đặt riêng', path: '/app/endpoints/custom-settings' },
              { title: 'Website AI theo dõi', path: '/app/endpoints/ai-websites' },
              { title: 'Nhật ký DLP', path: '/app/endpoints/dlp-events' },
              { title: 'Telemetry Agent', path: '/app/endpoints/telemetry' },
              { title: 'Desktop Agent', path: '/app/endpoints/agent' },
              { title: 'Browser Extension', path: '/app/endpoints/extension' }
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
            key: 'audit',
            title: 'Kiểm toán',
            description: 'Audit log',
            icon: <History size={18} />,
            subItems: [
              { title: 'Nhật ký kiểm toán', path: '/app/audit/logs' }
            ]
          }
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
              { title: 'Tổng quan thiết bị', path: '/app/endpoints' },
              { title: 'Thiết bị đã triển khai', path: '/app/endpoints/devices' },
              { title: 'Website AI', path: '/app/endpoints/ai-websites' },
              { title: 'Theo dõi Agent / DLP', path: '/app/endpoints/events' },
              { title: 'aiguard-endpoint-agent', path: '/app/endpoints/agent' },
              { title: 'aiguard-extension', path: '/app/endpoints/extension' }
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
              { title: 'Policy Rule Builder', path: '/app/governance/rules' }
            ]
          },
          {
            key: 'audit',
            title: 'Kiểm toán',
            description: 'Audit log',
            icon: <History size={18} />,
            subItems: [
              { title: 'Nhật ký kiểm toán', path: '/app/audit/logs' }
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
          { key: 'my_score', title: 'Điểm an toàn', description: 'Thói quen bảo mật', icon: <BadgeCheck size={18} />, path: '/app/my-usage/summary' }
        ];
    }
  }, [user?.role]);

  const productionMenuItems = rawMenuItems.filter(item =>
    user?.role === 'TenantOwner' ? item.key !== 'agents' : true
  );
  const securityAgentLabItem: SidebarItem = {
    key: 'agent_lab',
    title: 'AI Agent Lab',
    description: 'Dev/test tam thoi',
    icon: <Cpu size={18} />,
    path: '/app/dev/ai-agent-lab'
  };
  const menuItems = user?.role === 'SecurityAdmin'
    ? [productionMenuItems[0], securityAgentLabItem, ...productionMenuItems.slice(1)]
    : productionMenuItems;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <Shield className="logo-icon" size={24} />
          <span className="logo-text">AIGuard</span>
        </div>
        <span className="logo-subtitle">Control Tower</span>
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
        <div className="user-info-brief">
          <NavLink to="/app/profile" className="flex items-center gap-3 flex-1 min-w-0 no-underline hover:opacity-85">
            <div className="avatar-placeholder">
              {user?.fullName?.charAt(0).toUpperCase() || 'GB'}
            </div>
            <div className="min-w-0">
              <div className="user-name-brief truncate">{user?.fullName || 'User'}</div>
              <div className="user-role-brief truncate">{user?.role}</div>
            </div>
          </NavLink>
          <button onClick={logout} className="logout-button ml-auto" title="Đăng xuất">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
