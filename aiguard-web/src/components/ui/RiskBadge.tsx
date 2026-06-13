import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface RiskBadgeProps {
  level: 'Low' | 'Medium' | 'High' | 'Critical';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const { language } = useLanguage();
  const getStyles = () => {
    switch (level) {
      case 'Low':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'High':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Critical':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    }
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${getStyles()}`}>
      {language === 'vi'
        ? ({ Low: 'Thấp', Medium: 'Trung bình', High: 'Cao', Critical: 'Nghiêm trọng' } as const)[level]
        : level}
    </span>
  );
};
