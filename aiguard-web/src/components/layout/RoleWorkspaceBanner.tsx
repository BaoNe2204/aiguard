import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const workspaceCopy: Record<string, {
  eyebrow: string;
  title: string;
  description: string;
}> = {
  PlatformAdmin: {
    eyebrow: 'Nền tảng SaaS',
    title: 'Điều hành khách hàng, gói bán và license',
    description: 'Theo dõi hoạt động thương mại, xử lý đơn hàng, hỗ trợ tenant và kiểm soát license từ một nơi.'
  },
  TenantOwner: {
    eyebrow: 'Doanh nghiệp khách hàng',
    title: 'Mua gói, thanh toán và cấu hình tenant',
    description: 'Quản lý onboarding, license, thông tin công ty và các thiết lập vận hành cho doanh nghiệp.'
  },
  SecurityAdmin: {
    eyebrow: 'Trung tâm bảo mật',
    title: 'Kiểm soát DLP, policy và AI Agent',
    description: 'Giám sát dữ liệu nhạy cảm, xử lý cảnh báo, tinh chỉnh policy và kiểm soát hành động của AI Agent.'
  },
  DepartmentManager: {
    eyebrow: 'Quản lý phòng ban',
    title: 'Theo dõi log và phê duyệt yêu cầu của đội nhóm',
    description: 'Xem hoạt động AI trong phòng ban, duyệt prompt/file/request và theo dõi sự cố liên quan.'
  },
  Employee: {
    eyebrow: 'My Usage',
    title: 'Lịch sử sử dụng AI và yêu cầu của bạn',
    description: 'Theo dõi prompt đã kiểm tra, trạng thái phê duyệt và điểm thói quen an toàn cá nhân.'
  }
};

export const RoleWorkspaceBanner: React.FC = () => {
  const { user } = useAuth();
  const copy = workspaceCopy[user?.role || 'Employee'] || workspaceCopy.Employee;

  return (
    <section className="workspace-banner workspace-banner-simple">
      <div className="workspace-copy">
        <span>{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
    </section>
  );
};
