const { BACKEND_PUBLIC_URL } = require('../config/env');

const CDN_BASE_URL = String(
  process.env.CDN_BASE_URL || process.env.PUBLIC_MEDIA_BASE_URL || ''
).replace(/\/$/, '');

/** Absolute URL for API-served media (CDN in prod, BACKEND_PUBLIC_URL fallback). */
const resolvePublicMediaUrl = (relativePath) => {
  if (!relativePath) return '';
  if (/^https?:\/\//i.test(relativePath) || relativePath.startsWith('data:')) {
    return relativePath;
  }
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const base = CDN_BASE_URL || BACKEND_PUBLIC_URL || '';
  if (!base) return path;
  return `${base}${path}`;
};

module.exports = {
  CDN_BASE_URL,
  BACKEND_PUBLIC_URL,
  resolvePublicMediaUrl,
};
