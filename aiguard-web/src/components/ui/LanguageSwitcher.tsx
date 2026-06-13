import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={`language-switcher ${compact ? 'compact' : ''}`} aria-label={t('Select language', 'Chọn ngôn ngữ')}>
      <Languages size={15} />
      <button
        type="button"
        className={language === 'vi' ? 'active' : ''}
        onClick={() => setLanguage('vi')}
        title="Tiếng Việt"
      >
        VI
      </button>
      <span>/</span>
      <button
        type="button"
        className={language === 'en' ? 'active' : ''}
        onClick={() => setLanguage('en')}
        title="English"
      >
        EN
      </button>
    </div>
  );
};
