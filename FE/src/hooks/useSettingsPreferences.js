import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'fevents_settings';

export const DEFAULT_SETTINGS = {
  eventReminders: true,
  emailNotifications: true,
  soundNotifications: false,
  darkMode: false,
  language: 'vi',
};

export const loadSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = (settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const applyDarkMode = (enabled) => {
  document.documentElement.classList.toggle('dark', enabled);
  document.body.classList.toggle('dark', enabled);
};

export const initThemeFromStorage = () => {
  applyDarkMode(loadSettings().darkMode);
};

export const useSettingsPreferences = () => {
  const [settings, setSettings] = useState(loadSettings);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      if (key === 'darkMode') applyDarkMode(value);
      return next;
    });
  }, []);

  useEffect(() => {
    applyDarkMode(settings.darkMode);
  }, [settings.darkMode]);

  return { settings, updateSetting };
};
