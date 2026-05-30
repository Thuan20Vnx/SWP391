/** Đối tác — dữ liệu form & lưu mock (admin) */

import { CLUB_ACTIVITY_FIELDS } from './adminDataMaintenanceData';

export const ADMIN_PARTNER_STORAGE_KEY = 'fe_admin_partners_v1';

export const PARTNER_FIELD_OPTIONS = CLUB_ACTIVITY_FIELDS.map((label) => ({
  value: label,
  label,
}));

export const PARTNER_SPONSOR_PROGRAM_OPTIONS = [
  { value: 'unset', label: 'Chưa xác định' },
  { value: 'cash', label: 'Tài trợ tài chính' },
  { value: 'in_kind', label: 'Tài trợ hiện vật' },
  { value: 'media', label: 'Đồng hành truyền thông' },
  { value: 'venue', label: 'Hỗ trợ địa điểm / cơ sở' },
  { value: 'scholarship', label: 'Học bổng / quỹ tài trợ' },
];

export const PARTNER_UPLOAD_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const PARTNER_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const emptyPartnerForm = () => ({
  companyName: '',
  field: '',
  representative: '',
  email: '',
  phone: '',
  sponsorValue: '',
  sponsorProgram: 'unset',
});

export const formatVndInput = (raw) => {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
};

export const parseVndInput = (formatted) => String(formatted).replace(/\D/g, '');

export const loadStoredPartners = () => {
  try {
    const raw = localStorage.getItem(ADMIN_PARTNER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveStoredPartners = (list) => {
  localStorage.setItem(ADMIN_PARTNER_STORAGE_KEY, JSON.stringify(list));
};

export const partnerFormToRecord = (form, fileMeta = null) => ({
  id: `partner_${Date.now()}`,
  companyName: form.companyName.trim(),
  field: form.field,
  representative: form.representative.trim(),
  email: form.email.trim(),
  phone: form.phone.trim(),
  sponsorValue: parseVndInput(form.sponsorValue),
  sponsorProgram: form.sponsorProgram,
  attachmentName: fileMeta?.name || null,
  status: 'pending',
  createdAt: new Date().toISOString(),
});
