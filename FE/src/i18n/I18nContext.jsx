import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadSettings } from '../hooks/useSettingsPreferences';
import { SETTINGS_SYNC_EVENT } from '../utils/settingsEvents';
import { translate } from './translate';

const I18nContext = createContext({
  language: 'vi',
  t: (key) => key,
});

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => loadSettings().language || 'vi');

  useEffect(() => {
    const sync = () => setLanguage(loadSettings().language || 'vi');
    window.addEventListener(SETTINGS_SYNC_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SETTINGS_SYNC_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key, params) => translate(key, params, language), [language]);

  const value = useMemo(() => ({ language, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = () => useContext(I18nContext);

export default I18nContext;
