import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'vi' | 'en';

interface LanguageContextValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (english: string, vietnamese: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('aiguard_language');
    return saved === 'en' ? 'en' : 'vi';
  });

  useEffect(() => {
    localStorage.setItem('aiguard_language', language);
    document.documentElement.lang = language;
    document.title = language === 'vi'
      ? 'AIGuard - Trung tâm kiểm soát'
      : 'AIGuard Control Tower';
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: language === 'vi' ? 'vi-VN' : 'en-US',
    setLanguage: setLanguageState,
    t: (english, vietnamese) => language === 'vi' ? vietnamese : english,
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
};
