import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface DecisionBadgeProps {
  decision: 'Allow' | 'Mask' | 'PendingApproval' | 'Block';
}

export const DecisionBadge: React.FC<DecisionBadgeProps> = ({ decision }) => {
  const { t } = useLanguage();
  const styles = {
    Allow: 'ui-badge-success',
    Mask: 'ui-badge-info',
    PendingApproval: 'ui-badge-warning',
    Block: 'ui-badge-danger',
  } as const;
  const labels = {
    Allow: t('Allow', 'Cho phép'),
    Mask: t('Mask', 'Che dữ liệu'),
    PendingApproval: t('Pending', 'Chờ duyệt'),
    Block: t('Block', 'Chặn'),
  } as const;

  return <span className={`ui-badge ${styles[decision]}`}>{labels[decision]}</span>;
};
