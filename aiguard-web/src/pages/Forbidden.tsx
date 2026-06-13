import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export const Forbidden: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
      <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-6 animate-pulse">
        <ShieldAlert size={64} />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">{t('403 - Access Denied', '403 - Truy cập bị từ chối')}</h1>
      <p className="text-zinc-400 max-w-md mb-8">
        {t(
          'You do not have the required security clearances to view this management console. This action has been logged.',
          'Bạn không có đủ quyền bảo mật để xem trang quản trị này. Hành động truy cập đã được ghi nhật ký.'
        )}
      </p>
      <button className="btn-primary flex items-center gap-1.5" onClick={() => navigate('/app/dashboard')}>
        <ArrowLeft size={16} /> {t('Return to Dashboard', 'Quay lại tổng quan')}
      </button>
    </div>
  );
};
export default Forbidden;
