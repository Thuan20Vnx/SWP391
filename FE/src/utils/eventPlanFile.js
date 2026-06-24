export const EVENT_PLAN_MAX_BYTES = 10 * 1024 * 1024;

export const EVENT_PLAN_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const PLAN_MIME_PREFIXES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
];

export const isAllowedEventPlanFile = (file) => {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const byExt = /\.(pdf|docx?|xlsx?)$/.test(name);
  const byMime = PLAN_MIME_PREFIXES.some((prefix) => (file.type || '').startsWith(prefix));
  return byExt || byMime;
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const downloadDataUrlFile = (dataUrl, fileName = 'bang-ke-hoach-su-kien') => {
  if (!dataUrl) return;
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

export const canPreviewEventPlan = (mimeType = '', fileName = '') => {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();
  return mime.includes('pdf') || name.endsWith('.pdf') || mime.startsWith('image/');
};
