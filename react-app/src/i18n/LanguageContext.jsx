import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { LOCALES, DEFAULT_LANG, GAME_FONT } from './locales';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    // Пробуем восстановить из localStorage
    const saved = localStorage.getItem('portfolio_lang');
    if (saved && LOCALES[saved]) return saved;

    // Или определяем по браузеру
    const browserLang = navigator.language?.slice(0, 2);
    if (browserLang && LOCALES[browserLang]) return browserLang;

    return DEFAULT_LANG;
  });

  const setLanguage = useCallback((newLang) => {
    if (LOCALES[newLang]) {
      setLang(newLang);
      localStorage.setItem('portfolio_lang', newLang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = lang === 'en' ? 'ru' : 'en';
    setLanguage(newLang);
  }, [lang, setLanguage]);

  const t = useMemo(() => LOCALES[lang], [lang]);

  const value = useMemo(() => ({
    lang,
    setLanguage,
    toggleLanguage,
    t,
    font: GAME_FONT,
    availableLanguages: Object.keys(LOCALES),
  }), [lang, setLanguage, toggleLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return context;
}

// Экспорт для использования вне React (например, в PixiJS сценах)
export function getLocale(lang = DEFAULT_LANG) {
  return LOCALES[lang] || LOCALES[DEFAULT_LANG];
}

export { LOCALES, GAME_FONT };
