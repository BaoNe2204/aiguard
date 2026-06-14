import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Laptop,
  CheckSquare,
  Lock,
  Cpu,
  History,
  User,
  Settings,
  Briefcase,
  ChevronDown,
  ChevronRight,
  LogOut,
  Building2,
  PackageCheck,
  ClipboardList,
  KeyRound,
  Headphones
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface SidebarItem {
  key: string;
  title: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { title: string; path: string }[];
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    endpoints: true,
    approvals: false,
    policies: false,
    agents: false,
    audit: false,
    governance: false,
    business: true,
    myUsage: false
  });

  const toggleMenu = (key: string) => {
    setOpenMenus((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const getMenuItems = (): SidebarItem[] => {
    // Nếu là PlatformAdmin, hiển thị bộ menu phẳng, chuyên dụng
    if (user?.role === 'PlatformAdmin') {
      return [
        {
          key: 'platform_dashboard',
          title: t('Dashboard hệ thống', 'Dashboard hệ thống'),
          icon: <LayoutDashboard size={18} />,
          path: '/app/business/operations'
        },
        {
          key: 'platform_customers',
          title: t('Quản lý khách hàng', 'Quản lý khách hàng'),
          icon: <Building2 size={18} />,
          path: '/app/business/customers'
        },
        {
          key: 'platform_packages',
          title: t('Quản lý gói dịch vụ', 'Quản lý gói dịch vụ'),
          icon: <PackageCheck size={18} />,
          path: '/app/business/packages'
        },
        {
          key: 'platform_orders',
          title: t('Quản lý đơn hàng', 'Quản lý đơn hàng'),
          icon: <ClipboardList size={18} />,
          path: '/app/business/orders'
        },
        {
          key: 'platform_licenses',
          title: t('Quản lý License', 'Quản lý License'),
          icon: <KeyRound size={18} />,
          path: '/app/business/licenses'
        },
        {
          key: 'platform_support',
          title: t('Support Ticket', 'Support Ticket'),
          icon: <Headphones size={18} />,
          path: '/app/business/support'
        }
      ];
    }

    // Các role còn lại thì hiển thị bộ menu chuẩn
    return [
      {
        key: 'dashboard',
        title: t('Dashboard', 'Tổng quan'),
        icon: <LayoutDashboard size={18} />,
        path: '/app/dashboard'
      },
      {
        key: 'endpoints',
        title: t('Endpoint Protection', 'Bảo vệ thiết bị'),
        icon: <Laptop size={18} />,
        subItems: [
          { title: t('Devices', 'Thiết bị'), path: '/app/endpoints/devices' },
          { title: t('DLP Events', 'Nhật ký DLP'), path: '/app/endpoints/events' },
          { title: t('AI Websites', 'Website AI'), path: '/app/endpoints/ai-websites' },
          { title: t('Deployment', 'Triển khai'), path: '/app/endpoints/deployment' }
        ]
      },
      {
        key: 'approvals',
        title: t('Approval Center', 'Trung tâm phê duyệt'),
        icon: <CheckSquare size={18} />,
        subItems: [
          { title: t('Prompt Approvals', 'Duyệt prompt'), path: '/app/approvals/prompts' },
          { title: t('Agent Approvals', 'Duyệt hành động Agent'), path: '/app/approvals/agents' },
          { title: t('Approval History', 'Lịch sử phê duyệt'), path: '/app/approvals/history' }
        ]
      },
      {
        key: 'policies',
        title: t('Security Policy', 'Chính sách bảo mật'),
        icon: <Lock size={18} />,
        subItems: [
          { title: t('Department Rules', 'Quy tắc phòng ban'), path: '/app/policies/rules' },
          { title: t('Detectors', 'Bộ phát hiện'), path: '/app/policies/detectors' },
          { title: t('Whitelist & Blacklist', 'Danh sách trắng và đen'), path: '/app/policies/whitelist-blacklist' },
          { title: t('Policy Versions', 'Phiên bản chính sách'), path: '/app/policies/versions' }
        ]
      },
      {
        key: 'agents',
        title: t('Agent Control Tower', 'Kiểm soát AI Agent'),
        icon: <Cpu size={18} />,
        subItems: [
          { title: t('Agent Registry', 'Danh sách Agent'), path: '/app/agents' },
          { title: t('Tool Permissions', 'Quyền sử dụng công cụ'), path: '/app/agents/permissions' },
          { title: t('Tool-call Monitor', 'Giám sát tool-call'), path: '/app/agents/monitor' },
          { title: t('Prompt Injection Logs', 'Nhật ký prompt injection'), path: '/app/agents/prompt-injection' },
          { title: t('Policy Simulation', 'Mô phỏng chính sách'), path: '/app/agents/simulation' },
          { title: t('Runtime Controls', 'Kiểm soát Runtime'), path: '/app/agents/runtime' },
          { title: t('Red-team Tests', 'Kiểm thử Red-team'), path: '/app/agents/red-team' }
        ]
      },
      {
        key: 'audit',
        title: t('Audit & Blockchain', 'Kiểm toán và Blockchain'),
        icon: <History size={18} />,
        subItems: [
          { title: t('System Audit Logs', 'Nhật ký kiểm toán'), path: '/app/audit/logs' },
          { title: t('Blockchain Batches', 'Lô neo Blockchain'), path: '/app/blockchain/batches' }
        ]
      },
      {
        key: 'governance',
        title: t('Security Governance', 'Quản trị bảo mật'),
        icon: <Settings size={18} />,
        subItems: [
          { title: t('System Health', 'Sức khỏe hệ thống'), path: '/app/governance/health' },
          { title: t('Users & Departments', 'Người dùng & phòng ban'), path: '/app/governance/identity' },
          { title: t('False Positives', 'Báo cáo chặn nhầm'), path: '/app/governance/false-positives' },
          { title: t('Incidents', 'Quản lý sự cố'), path: '/app/governance/incidents' },
          { title: t('Policy Rule Builder', 'Trình tạo chính sách'), path: '/app/governance/rules' },
          { title: t('Retention & SIEM', 'Lưu trữ & SIEM'), path: '/app/governance/settings' }
        ]
      },
      {
        key: 'business',
        title: t('Business Management', 'Quản trị Kinh doanh'),
        icon: <Briefcase size={18} />,
        subItems: [
          { title: t('Order Management', 'Quản lý đơn hàng'), path: '/app/business/orders' },
          { title: t('License Management', 'Quản lý License'), path: '/app/business/licenses' },
          { title: t('Tenant CRM', 'Khách hàng / Tenant CRM'), path: '/app/business/customers' },
          { title: t('Invoices', 'Hóa đơn & thanh toán'), path: '/app/business/invoices' },
          { title: t('Trial Onboarding', 'Trial / Onboarding'), path: '/app/business/onboarding' },
          { title: t('Support Tickets', 'Support / Ticket'), path: '/app/business/support' }
        ]
      },
      {
        key: 'myUsage',
        title: t('My Usage (Portal)', 'Hoạt động của tôi'),
        icon: <User size={18} />,
        subItems: [
          { title: t('Personal Logs', 'Nhật ký cá nhân'), path: '/app/my-usage/logs' },
          { title: t('My Approvals', 'Yêu cầu của tôi'), path: '/app/my-usage/approvals' }
        ]
      }
    ];
  };

  const visibleMenuItems = getMenuItems()
    .filter((item) => {
      // PlatformAdmin logic is already handled, so we only filter for the rest
      if (user?.role === 'PlatformAdmin') return true;

      switch (user?.role) {
        case 'Employee':
          return ['myUsage'].includes(item.key);
        case 'DepartmentManager':
          return ['dashboard', 'endpoints', 'approvals', 'governance', 'myUsage'].includes(item.key);
        case 'TenantOwner':
        case 'SecurityAdmin':
          return true;
        default:
          return ['myUsage'].includes(item.key);
      }
    })
    .map((item) => {
      if (!item.subItems) return item;

      if (item.key === 'governance') {
        const allowedPaths = user?.role === 'TenantOwner'
          ? null
          : user?.role === 'SecurityAdmin'
            ? ['/app/governance/health', '/app/governance/false-positives', '/app/governance/incidents', '/app/governance/rules']
            : ['/app/governance/health', '/app/governance/incidents'];

        return {
          ...item,
          subItems: allowedPaths
            ? item.subItems.filter(subItem => allowedPaths.includes(subItem.path))
            : item.subItems
        };
      }

      if (item.key !== 'endpoints') return item;

      const allowedPaths = user?.role === 'TenantOwner'
        ? null
        : user?.role === 'SecurityAdmin'
          ? ['/app/endpoints/devices', '/app/endpoints/events', '/app/endpoints/ai-websites']
          : ['/app/endpoints/events'];

      return {
        ...item,
        subItems: allowedPaths
          ? item.subItems.filter((subItem) => allowedPaths.includes(subItem.path))
          : item.subItems
      };
    });

  const userInitials = user?.fullName
    ? user.fullName.split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <Shield className="logo-icon text-indigo-500" size={24} />
          <span className="logo-text">AIGuard</span>
        </div>
        <span className="logo-subtitle">Control Tower</span>
      </div>

      <nav className="sidebar-nav">
        {visibleMenuItems.map((item) => {
          if (item.path) {
            return (
              <NavLink
                key={item.key}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span className="nav-text">{item.title}</span>
              </NavLink>
            );
          }

          const isOpen = openMenus[item.key];
          return (
            <div key={item.key} className="nav-group">
              <button className="nav-group-trigger" onClick={() => toggleMenu(item.key)}>
                <span className="flex items-center gap-2">
                  {item.icon}
                  <span className="nav-text">{item.title}</span>
                </span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isOpen && (
                <div className="nav-sub-items">
                  {item.subItems?.map((subItem) => (
                    <NavLink
                      key={subItem.path}
                      to={subItem.path}
                      className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                    >
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
            <span className="user-name">{user?.fullName || 'User'}</span>
            <span className="user-role">{t(user?.role || 'Guest', user?.role || 'Guest')}</span>
          </div>
        </div>
        <button className="btn-logout" onClick={logout} title={t('Logout', 'Đăng xuất')}>
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
