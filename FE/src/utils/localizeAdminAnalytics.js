import { loadSettings } from '../hooks/useSettingsPreferences';
import { resolveLabel } from '../i18n/helpers';

const resolveLang = (language) => language || loadSettings().language || 'vi';

export const formatAnalyticsDateTime = (date, language) => {
  const lang = resolveLang(language);
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const time = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: lang === 'en',
  });
  const datePart = date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${time}, ${datePart}`;
};

const localizeField = (value, key, t, language) => {
  if (!value || resolveLang(language) === 'vi') return value;
  return key && t ? t(key) : value;
};

export const localizeAnalyticsCategory = (cat, t, language) => {
  if (!cat) return cat;
  return {
    ...cat,
    label: resolveLabel(cat, t),
  };
};

export const localizeAnalyticsEvent = (row, t, language) => {
  if (!row) return row;
  if (resolveLang(language) === 'vi') return row;
  return {
    ...row,
    name: localizeField(row.name, row.nameKey, t, language),
    org: localizeField(row.org, row.orgKey, t, language),
    category: row.categoryKey ? t(row.categoryKey) : row.category,
  };
};

export const localizeAnalyticsReview = (review, t, language) => {
  if (!review) return review;
  if (resolveLang(language) === 'vi') return review;
  return {
    ...review,
    event: localizeField(review.event, review.eventNameKey, t, language),
    excerpt: localizeField(review.excerpt, review.excerptKey, t, language),
  };
};

export const localizeAnalyticsOverview = (overview, t, language) => {
  if (!overview) return overview;
  if (resolveLang(language) === 'vi') return overview;
  return {
    ...overview,
    trendCaption: overview.trendCaptionKey ? t(overview.trendCaptionKey) : overview.trendCaption,
  };
};

export const localizeAnalyticsList = (items, localizeFn, t, language) =>
  items.map((item) => localizeFn(item, t, language));
