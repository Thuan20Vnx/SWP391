import { API_BASE, getAuthHeaders } from '../utils/api';

const COMPANY_STORAGE_KEY = 'fevents_partner_company';
const NOTIFY_STORAGE_KEY = 'fevents_partner_notifications';

export const PARTNER_MOCK_STATS = [
  { label: 'Tổng số sự kiện', value: '12', trend: '+2 tháng này' },
  { label: 'Tổng lượt đăng ký', value: '3,450', trend: '+12.4%' },
  { label: 'Sự kiện sắp diễn ra', value: '02', trend: 'Sắp khởi động trong 48h' },
  { label: 'Tổng doanh thu tài trợ', value: '150M VNĐ', trend: 'Kỳ hiện tại' }
];

export const PARTNER_MOCK_EVENTS = [
  {
    id: 'p-ev-1',
    title: 'Tech Talk 2026 — FPT Software',
    category: 'Công nghệ',
    date: '15/06/2026',
    time: '14:00',
    location: 'Hội trường Alpha',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    remainingTickets: 120,
    totalTickets: 200,
    status: 'MỞ ĐĂNG KÝ',
    statusKey: 'approved',
    source: 'partner'
  },
  {
    id: 'p-ev-2',
    title: 'FPT Recruitment Day 2026',
    category: 'Kết nối',
    date: '22/06/2026',
    time: '09:00',
    location: 'Sân FPT',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80',
    remainingTickets: 80,
    totalTickets: 150,
    status: 'CHỜ ADMIN DUYỆT',
    statusKey: 'pending_admin',
    source: 'partner'
  }
];

export const DEFAULT_PARTNER_COMPANY = {
  companyName: 'Công ty TNHH Phần mềm FPT (FPT Software)',
  taxId: '0101248141',
  representative: 'Phạm Minh Tuấn',
  email: 'fsoft.contact@fpt.com',
  phone: '+84 24 3768 9048',
  address: 'Tòa nhà FPT, Phố Duy Tân, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
  logo: ''
};

export const DEFAULT_PARTNER_NOTIFICATIONS = {
  proposalUpdates: true,
  monthlyReportEmail: true,
  newReviewAlerts: true
};

const parseJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Yêu cầu thất bại');
  }
  return data;
};

export const fetchPartnerStats = () =>
  Promise.resolve({ stats: PARTNER_MOCK_STATS });

export const fetchPartnerEvents = () =>
  Promise.resolve({ events: PARTNER_MOCK_EVENTS });

export const loadPartnerCompanyProfile = () => {
  try {
    const raw = localStorage.getItem(COMPANY_STORAGE_KEY);
    if (raw) return { ...DEFAULT_PARTNER_COMPANY, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  const email = localStorage.getItem('userEmail') || DEFAULT_PARTNER_COMPANY.email;
  const name = localStorage.getItem('userFullname') || DEFAULT_PARTNER_COMPANY.representative;
  return { ...DEFAULT_PARTNER_COMPANY, email, representative: name };
};

export const savePartnerCompanyProfile = (payload) => {
  localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(payload));
  return Promise.resolve({ success: true, company: payload });
};

export const loadPartnerNotificationPrefs = () => {
  try {
    const raw = localStorage.getItem(NOTIFY_STORAGE_KEY);
    if (raw) return { ...DEFAULT_PARTNER_NOTIFICATIONS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PARTNER_NOTIFICATIONS };
};

export const savePartnerNotificationPrefs = (prefs) => {
  localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(prefs));
  return Promise.resolve({ success: true, prefs });
};

export const changePartnerPassword = (currentPassword, newPassword) =>
  fetch(`${API_BASE}/api/user/change-password`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  }).then(parseJson);

export const PARTNER_RECENT_ACTIVITY = [
  {
    id: 1,
    text: 'CTSV đã phê duyệt đề xuất sự kiện: Tech Talk 2026',
    time: '10 phút trước'
  },
  {
    id: 2,
    text: 'Thanh toán hợp đồng tài trợ thành công — Mã HD9928',
    time: '2 giờ trước'
  },
  {
    id: 3,
    text: "Sự kiện 'Tuyển dụng FPT Software' đã được publish lên trang chủ",
    time: 'Hôm qua'
  }
];

export const PARTNER_PERFORMANCE = [
  { name: 'Tech Talk 2026', rate: 95 },
  { name: 'FPT Recruitment', rate: 72 },
  { name: 'AI Workshop', rate: 60 }
];
