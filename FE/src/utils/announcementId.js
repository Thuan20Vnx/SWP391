/** Chuẩn hóa id thông báo từ API (hỗ trợ _id, id, ObjectId). */
export const resolveAnnouncementId = (item) => {
  if (!item) return '';
  const raw = item.id ?? item._id;
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && typeof raw.toHexString === 'function') return raw.toHexString();
  if (typeof raw === 'object' && raw.$oid) return String(raw.$oid).trim();
  return String(raw).trim();
};
