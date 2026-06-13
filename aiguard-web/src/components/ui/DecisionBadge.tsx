import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface DecisionBadgeProps {
  decision: 'Allow' | 'Mask' | 'PendingApproval' | 'Block';
}

export const DecisionBadge: React.FC<DecisionBadgeProps> = ({ decision }) => {
  const { t } = useLanguage();

  const styles = {
    Allow: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    Mask: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    PendingApproval: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    Block: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  } as const;

  const labels = {
    Allow: t('Allow', 'Cho phép'),
    Mask: t('Mask', 'Che dữ liệu'),
    PendingApproval: t('Pending', 'Chờ duyệt'),
    Block: t('Block', 'Chặn'),
  } as const;

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${styles[decision]}`}>
      {labels[decision]}
    </span>
  );
};
