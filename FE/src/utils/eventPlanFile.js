import { API_BASE, getAuthHeaders } from './api';

export const EVENT_PLAN_MAX_BYTES = 10 * 1024 * 1024;

export const EVENT_PLAN_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-zip-compressed';

const PLAN_MIME_PREFIXES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/zip',
  'application/x-zip-compressed',
];

export const isAllowedEventPlanFile = (file) => {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const byExt = /\.(pdf|docx?|xlsx?|zip)$/.test(name);
  const byMime = PLAN_MIME_PREFIXES.some((prefix) => (file.type || '').startsWith(prefix));
  return byExt || byMime;
};

export const isValidEventPlanLink = (value) => {
  const url = String(value || '').trim();
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const normalizeEventPlanLink = (value) => String(value || '').trim();

/** URL tải/xem file kế hoạch — hỗ trợ data URL, http và /api/... */
export const resolveEventPlanFileUrl = (source) => {
  const raw =
    typeof source === 'string'
      ? source
      : source?.eventPlanUrl || source?.eventPlanFile || '';
  if (!raw) return '';
  if (raw.startsWith('data:') || /^https?:\/\//i.test(raw)) return raw;
  const base = API_BASE || '';
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
};

export const fetchPlanFileBlobUrl = async (source) => {
  const resolved = resolveEventPlanFileUrl(source);
  if (!resolved) return '';
  // data: URL đã nhúng sẵn nội dung — dùng trực tiếp, download attr vẫn giữ tên.
  if (resolved.startsWith('data:')) return resolved;
  // http(s) (Cloudinary) hoặc /api: tải về Blob rồi tạo blob: URL cùng origin.
  // Bắt buộc với URL khác origin: thuộc tính `download` của thẻ <a> bị bỏ qua khi
  // tải chéo origin, trình duyệt lấy tên từ Content-Disposition của Cloudinary
  // (= public_id, không đuôi) → file tải về mất tên/đuôi. Blob same-origin thì
  // `download="tên.docx"` mới có hiệu lực.
  const isRemote = /^https?:\/\//i.test(resolved);
  const res = await fetch(resolved, isRemote ? {} : { headers: getAuthHeaders(false) });
  if (!res.ok) throw new Error('Không tải được file kế hoạch.');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export const downloadPlanFile = async (source, fileName = 'bang-ke-hoach-su-kien') => {
  const blobUrl = await fetchPlanFileBlobUrl(source);
  if (!blobUrl) return;
  try {
    downloadDataUrlFile(blobUrl, fileName);
  } finally {
    if (blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
  }
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
