import {
  loadPartnerNotificationPrefs,
  savePartnerNotificationPrefs,
} from '../../services/partnerApi';
import {
  loadIcpdpNotificationPrefs,
  saveIcpdpNotificationPrefs,
} from '../../services/icpdpApi';

const CTSV_NOTIF_KEY = 'ctsv_notif_prefs';
const ADMIN_NOTIF_KEY = 'admin_notif_prefs';
const CLUB_NOTIF_KEY = 'club_manager_notif_prefs';

export const normalizeSettingsRole = (role) => {
  const r = String(role || '').toLowerCase();
  if (['ctsv', 'icpdp', 'partner', 'admin', 'club_manager'].includes(r)) return r;
  return 'student';
};

const DEFAULT_CTSV_NOTIFICATIONS = {
  proposalPending: true,
  eventApproval: true,
  partnerRequests: true,
  systemAlerts: false,
};

const DEFAULT_ADMIN_NOTIFICATIONS = {
  pendingApprovals: true,
  securityAlerts: true,
  systemMaintenance: true,
  emailDigest: false,
};

const DEFAULT_CLUB_NOTIFICATIONS = {
  eventApprovalUpdates: true,
  memberJoinRequests: true,
  moderationUpdates: true,
};

export const ROLE_NOTIFICATION_OPTIONS = {
  student: [
    {
      key: 'eventReminders',
      label: 'Nhắc lịch sự kiện',
      description: 'Thông báo trước khi sự kiện đã đăng ký bắt đầu',
      defaultValue: true,
      universal: true,
    },
    {
      key: 'emailNotifications',
      label: 'Thông báo qua email',
      description: 'Nhận email khi có cập nhật sự kiện hoặc thông báo mới',
      defaultValue: true,
      universal: true,
    },
    {
      key: 'soundNotifications',
      label: 'Âm thanh thông báo',
      description: 'Phát âm thanh khi có thông báo trên trình duyệt',
      defaultValue: false,
      universal: true,
    },
  ],
  club_manager: [
    {
      key: 'eventApprovalUpdates',
      label: 'Cập nhật duyệt sự kiện',
      description: 'Thông báo khi IC-PDP/Admin phê duyệt hoặc từ chối đề xuất CLB',
      defaultValue: true,
    },
    {
      key: 'memberJoinRequests',
      label: 'Yêu cầu tham gia CLB',
      description: 'Thông báo khi sinh viên gửi đơn gia nhập câu lạc bộ',
      defaultValue: true,
    },
    {
      key: 'moderationUpdates',
      label: 'Hoãn / hủy sự kiện',
      description: 'Cập nhật trạng thái yêu cầu hoãn hoặc hủy sự kiện',
      defaultValue: true,
    },
    {
      key: 'eventReminders',
      label: 'Nhắc lịch sự kiện',
      description: 'Nhắc trước giờ diễn ra sự kiện CLB',
      defaultValue: true,
      universal: true,
    },
    {
      key: 'emailNotifications',
      label: 'Thông báo qua email',
      description: 'Nhận email về sự kiện và hoạt động CLB',
      defaultValue: true,
      universal: true,
    },
  ],
  ctsv: [
    {
      key: 'proposalPending',
      label: 'Đề xuất chờ duyệt',
      description: 'Thông báo khi CLB/đối tác gửi đề xuất mới',
      defaultValue: true,
    },
    {
      key: 'eventApproval',
      label: 'Phê duyệt sự kiện',
      description: 'Cập nhật khi Admin duyệt hoặc từ chối sự kiện cấp trường',
      defaultValue: true,
    },
    {
      key: 'partnerRequests',
      label: 'Đơn đăng ký đối tác',
      description: 'Thông báo khi có đối tác mới chờ xét duyệt',
      defaultValue: true,
    },
    {
      key: 'systemAlerts',
      label: 'Cảnh báo hệ thống',
      description: 'Thông báo bảo trì và cấu hình từ Admin',
      defaultValue: false,
    },
  ],
  icpdp: [
    {
      key: 'proposalSubmitted',
      label: 'Đề xuất CLB mới',
      description: 'Khi CLB gửi đề xuất sự kiện chờ IC-PDP duyệt',
      defaultValue: true,
    },
    {
      key: 'eventApprovedByCtsv',
      label: 'Phê duyệt từ CTSV',
      description: 'Khi CTSV quyết định phê duyệt cuối cùng',
      defaultValue: true,
    },
    {
      key: 'reportSubmitted',
      label: 'Báo cáo sau sự kiện',
      description: 'Khi CLB nộp báo cáo đánh giá sự kiện',
      defaultValue: true,
    },
    {
      key: 'systemAlerts',
      label: 'Cảnh báo hệ thống',
      description: 'Thông báo quan trọng từ nền tảng',
      defaultValue: false,
    },
  ],
  partner: [
    {
      key: 'proposalUpdates',
      label: 'Cập nhật duyệt đề xuất',
      description: 'Khi CTSV phê duyệt hoặc từ chối đề xuất sự kiện',
      defaultValue: true,
    },
    {
      key: 'monthlyReportEmail',
      label: 'Báo cáo định kỳ qua email',
      description: 'Báo cáo hiệu suất và doanh thu tài trợ hàng tháng',
      defaultValue: true,
    },
    {
      key: 'newReviewAlerts',
      label: 'Đánh giá mới từ sinh viên',
      description: 'Khi có đánh giá mới sau sự kiện bạn tài trợ',
      defaultValue: true,
    },
  ],
  admin: [
    {
      key: 'pendingApprovals',
      label: 'Yêu cầu chờ duyệt',
      description: 'Sự kiện, đối tác và đơn đăng ký chờ Admin',
      defaultValue: true,
    },
    {
      key: 'securityAlerts',
      label: 'Cảnh báo bảo mật',
      description: 'Đăng nhập bất thường và thay đổi quyền quan trọng',
      defaultValue: true,
    },
    {
      key: 'systemMaintenance',
      label: 'Lịch bảo trì',
      description: 'Nhắc trước khi bật chế độ bảo trì hệ thống',
      defaultValue: true,
    },
    {
      key: 'emailDigest',
      label: 'Bản tin email hàng tuần',
      description: 'Tổng hợp hoạt động nền tảng qua email',
      defaultValue: false,
    },
  ],
};

export const ROLE_SECTION_META = {
  security: {
    student: 'Quản lý mật khẩu và phiên đăng nhập của bạn.',
    club_manager: 'Bảo mật tài khoản quản lý câu lạc bộ.',
    ctsv: 'Bảo mật tài khoản cán bộ CTSV.',
    icpdp: 'Bảo mật tài khoản cán bộ IC-PDP.',
    partner: 'Bảo mật tài khoản đối tác và phiên đăng nhập.',
    admin: 'Bảo mật tài khoản quản trị hệ thống.',
  },
  notifications: {
    student: 'Tùy chỉnh cách bạn nhận thông báo từ F-Events.',
    club_manager: 'Thông báo về sự kiện CLB, thành viên và duyệt đơn.',
    ctsv: 'Thông báo về đề xuất, sự kiện trường và đối tác.',
    icpdp: 'Thông báo về đề xuất CLB và phê duyệt sự kiện.',
    partner: 'Thông báo về đề xuất, hợp đồng và đánh giá sự kiện.',
    admin: 'Thông báo về duyệt đơn và vận hành hệ thống.',
  },
};

const readJsonStorage = (key, defaults) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...defaults };
};

const writeJsonStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const getRoleDefaults = (role) => {
  const options = ROLE_NOTIFICATION_OPTIONS[role] || ROLE_NOTIFICATION_OPTIONS.student;
  return options.reduce((acc, opt) => {
    acc[opt.key] = opt.defaultValue;
    return acc;
  }, {});
};

export const loadRoleNotifications = (role) => {
  const normalized = normalizeSettingsRole(role);
  if (normalized === 'partner') return loadPartnerNotificationPrefs();
  if (normalized === 'icpdp') return loadIcpdpNotificationPrefs();
  if (normalized === 'ctsv') {
    return readJsonStorage(CTSV_NOTIF_KEY, DEFAULT_CTSV_NOTIFICATIONS);
  }
  if (normalized === 'admin') {
    return readJsonStorage(ADMIN_NOTIF_KEY, DEFAULT_ADMIN_NOTIFICATIONS);
  }
  if (normalized === 'club_manager') {
    return readJsonStorage(CLUB_NOTIF_KEY, DEFAULT_CLUB_NOTIFICATIONS);
  }
  return {};
};

export const saveRoleNotifications = (role, prefs) => {
  const normalized = normalizeSettingsRole(role);
  if (normalized === 'partner') {
    savePartnerNotificationPrefs(prefs);
    return;
  }
  if (normalized === 'icpdp') {
    saveIcpdpNotificationPrefs(prefs);
    return;
  }
  if (normalized === 'ctsv') {
    writeJsonStorage(CTSV_NOTIF_KEY, prefs);
    return;
  }
  if (normalized === 'admin') {
    writeJsonStorage(ADMIN_NOTIF_KEY, prefs);
    return;
  }
  if (normalized === 'club_manager') {
    writeJsonStorage(CLUB_NOTIF_KEY, prefs);
  }
};

export const getRoleNotificationOptions = (role) =>
  ROLE_NOTIFICATION_OPTIONS[normalizeSettingsRole(role)] || ROLE_NOTIFICATION_OPTIONS.student;

export const getRoleSectionDescription = (sectionId, role) =>
  ROLE_SECTION_META[sectionId]?.[normalizeSettingsRole(role)] ||
  ROLE_SECTION_META[sectionId]?.student ||
  '';
