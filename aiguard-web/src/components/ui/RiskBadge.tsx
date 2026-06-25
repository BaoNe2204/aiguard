import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface RiskBadgeProps {
  level: 'Low' | 'Medium' | 'High' | 'Critical';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const { language } = useLanguage();
  const styles = {
    Low: 'ui-badge-success',
    Medium: 'ui-badge-warning',
    High: 'ui-badge-orange',
    Critical: 'ui-badge-danger',
  } as const;
  const labels = {
    Low: language === 'vi' ? 'Thấp' : 'Low',
    Medium: language === 'vi' ? 'Trung bình' : 'Medium',
    High: language === 'vi' ? 'Cao' : 'High',
    Critical: language === 'vi' ? 'Nghiêm trọng' : 'Critical',
  } as const;

  return <span className={`ui-badge ${styles[level]}`}>{labels[level]}</span>;
};
