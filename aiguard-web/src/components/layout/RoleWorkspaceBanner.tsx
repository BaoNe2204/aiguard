import React from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  CheckSquare,
  ClipboardList,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const workspaceCopy: Record<string, {
  eyebrow: string;
  title: string;
  description: string;
  stats: { label: string; value: string; icon: React.ReactNode }[];
  actions: { label: string; path: string }[];
}> = {
  PlatformAdmin: {
    eyebrow: 'Nền tảng SaaS',
    title: 'Điều hành khách hàng, gói bán và license',
    description: 'Theo dõi hoạt động thương mại, xử lý đơn hàng, hỗ trợ tenant và kiểm soát license từ một nơi.',
    stats: [
      { label: 'Khách hàng', value: 'CRM', icon: <Building2 size={16} /> },
      { label: 'Đơn hàng', value: 'Orders', icon: <ClipboardList size={16} /> },
      { label: 'License', value: 'Keys', icon: <KeyRound size={16} /> }
    ],
    actions: [
      { label: 'Khách hàng', path: '/app/business/customers' },
      { label: 'Đơn hàng', path: '/app/business/orders' }
    ]
  },
  TenantOwner: {
    eyebrow: 'Doanh nghiệp khách hàng',
    title: 'Mua gói, thanh toán và cấu hình tenant',
    description: 'Quản lý onboarding, license, thông tin công ty và các thiết lập vận hành cho doanh nghiệp.',
    stats: [
      { label: 'Onboarding', value: 'Setup', icon: <BadgeCheck size={16} /> },
      { label: 'Thanh toán', value: 'Pay', icon: <ClipboardList size={16} /> },
      { label: 'Cấu hình', value: 'Tenant', icon: <Building2 size={16} /> }
    ],
    actions: [
      { label: 'Onboarding', path: '/app/business/onboarding' },
      { label: 'Gói dịch vụ', path: '/app/business/packages' }
    ]
  },
  SecurityAdmin: {
    eyebrow: 'Trung tâm bảo mật',
    title: 'Kiểm soát DLP, policy và AI Agent',
    description: 'Giám sát dữ liệu nhạy cảm, xử lý cảnh báo, tinh chỉnh policy và kiểm soát hành động của AI Agent.',
    stats: [
      { label: 'DLP', value: 'Active', icon: <ShieldCheck size={16} /> },
      { label: 'Policy', value: 'Rules', icon: <Lock size={16} /> },
      { label: 'Agent', value: 'Control', icon: <Sparkles size={16} /> }
    ],
    actions: [
      { label: 'DLP Events', path: '/app/endpoints/events' },
      { label: 'Policy', path: '/app/policies/rules' }
    ]
  },
  DepartmentManager: {
    eyebrow: 'Quản lý phòng ban',
    title: 'Theo dõi log và phê duyệt yêu cầu của đội nhóm',
    description: 'Xem hoạt động AI trong phòng ban, duyệt prompt/file/request và theo dõi sự cố liên quan.',
    stats: [
      { label: 'Log', value: 'Team', icon: <ClipboardList size={16} /> },
      { label: 'Duyệt', value: 'Queue', icon: <CheckSquare size={16} /> },
      { label: 'Sự cố', value: 'Cases', icon: <ShieldCheck size={16} /> }
    ],
    actions: [
      { label: 'Log nhân viên', path: '/app/endpoints/events' },
      { label: 'Phê duyệt', path: '/app/approvals/prompts' }
    ]
  },
  Employee: {
    eyebrow: 'My Usage',
    title: 'Lịch sử sử dụng AI và yêu cầu của bạn',
    description: 'Theo dõi prompt đã kiểm tra, trạng thái phê duyệt và điểm thói quen an toàn cá nhân.',
    stats: [
      { label: 'Log', value: 'Mine', icon: <ClipboardList size={16} /> },
      { label: 'Request', value: 'Status', icon: <CheckSquare size={16} /> },
      { label: 'Hồ sơ', value: 'Profile', icon: <User size={16} /> }
    ],
    actions: [
      { label: 'Nhật ký', path: '/app/my-usage/logs' },
      { label: 'Yêu cầu', path: '/app/my-usage/approvals' }
    ]
  }
};

export const RoleWorkspaceBanner: React.FC = () => {
  const { user } = useAuth();
  const copy = workspaceCopy[user?.role || 'Employee'] || workspaceCopy.Employee;

  return (
    <section className="workspace-banner">
      <div className="workspace-copy">
        <span>{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
      <div className="workspace-side">
        <div className="workspace-stats">
          {copy.stats.map((stat) => (
            <div key={stat.label} className="workspace-stat">
              {stat.icon}
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </div>
          ))}
        </div>
        <div className="workspace-actions">
          {copy.actions.map((action) => (
            <Link key={action.path} to={action.path}>{action.label}</Link>
          ))}
        </div>
      </div>
    </section>
  );
};
