import { loadSettings } from '../hooks/useSettingsPreferences';
import { translations } from './translations';

export const interpolate = (text, params = {}) =>
  String(text).replace(/\{\{(\w+)\}\}/g, (_, key) => (params[key] != null ? params[key] : ''));

export const translate = (key, params, language) => {
  const locale = language || loadSettings().language || 'vi';
  const table = translations[locale] || translations.vi;
  const fallback = translations.vi[key] || key;
  const value = table[key] ?? fallback;
  return interpolate(value, params);
};

export const tStatic = (key, params) => translate(key, params);
