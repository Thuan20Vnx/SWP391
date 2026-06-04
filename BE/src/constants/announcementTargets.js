/** Đối tượng nhận thông báo — đồng bộ FE/src/constants/announcementTargets.js */

const ANNOUNCEMENT_TARGET_ALL = 'all';

const ANNOUNCEMENT_TARGETS = [
  ANNOUNCEMENT_TARGET_ALL,
  'guest',
  'student',
  'club_manager',
  'partner',
  'icpdp',
  'ctsv',
  'admin'
];

const ANNOUNCEMENT_PUBLISHER_ROLES = ['admin', 'ctsv', 'icpdp', 'club_manager', 'partner'];

/** Đối tượng mà từng vai trò được phép chọn khi gửi */
const PUBLISHER_ALLOWED_TARGETS = {
  admin: ANNOUNCEMENT_TARGETS,
  ctsv: ANNOUNCEMENT_TARGETS,
  icpdp: [ANNOUNCEMENT_TARGET_ALL, 'student', 'club_manager', 'icpdp', 'ctsv'],
  club_manager: [ANNOUNCEMENT_TARGET_ALL, 'guest', 'student', 'club_manager'],
  partner: ['ctsv']
};

const normalizeTargetRole = (value) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'all' || raw === 'tat_ca' || raw === 'tất cả') return ANNOUNCEMENT_TARGET_ALL;
  const legacy = {
    guest: 'guest',
    student: 'student',
    club_manager: 'club_manager',
    club: 'club_manager',
    partner: 'partner',
    icpdp: 'icpdp',
    ctsv: 'ctsv',
    admin: 'admin'
  };
  return legacy[raw] || (ANNOUNCEMENT_TARGETS.includes(raw) ? raw : null);
};

const normalizeTargetRoles = (input) => {
  if (!input) return [ANNOUNCEMENT_TARGET_ALL];
  const list = Array.isArray(input) ? input : [input];
  const normalized = [...new Set(list.map(normalizeTargetRole).filter(Boolean))];
  if (normalized.includes(ANNOUNCEMENT_TARGET_ALL)) return [ANNOUNCEMENT_TARGET_ALL];
  return normalized.length ? normalized : [ANNOUNCEMENT_TARGET_ALL];
};

/** Đọc target từ bản ghi legacy (target_roles_json) hoặc schema mới */
const resolveDocTargetRoles = (doc) => {
  if (Array.isArray(doc?.targetRoles) && doc.targetRoles.length) {
    return normalizeTargetRoles(doc.targetRoles);
  }
  if (Array.isArray(doc?.target_roles_json) && doc.target_roles_json.length) {
    return normalizeTargetRoles(doc.target_roles_json);
  }
  return [ANNOUNCEMENT_TARGET_ALL];
};

const canPublisherUseTargets = (publisherRole, targetRoles) => {
  const allowed = PUBLISHER_ALLOWED_TARGETS[publisherRole] || [];
  const normalized = normalizeTargetRoles(targetRoles);
  return normalized.every((t) => allowed.includes(t));
};

const viewerMatchesTargets = (viewerRole, doc, viewerEmail = '') => {
  const targets = resolveDocTargetRoles(doc);
  const role = normalizeTargetRole(viewerRole) || 'guest';
  const targetedEmail = String(doc?.targetPartnerEmail || '').trim().toLowerCase();

  if (targetedEmail) {
    if (role !== 'partner') return false;
    return String(viewerEmail || '').trim().toLowerCase() === targetedEmail;
  }

  if (targets.includes(ANNOUNCEMENT_TARGET_ALL)) return true;
  return targets.includes(role);
};

module.exports = {
  ANNOUNCEMENT_TARGET_ALL,
  ANNOUNCEMENT_TARGETS,
  ANNOUNCEMENT_PUBLISHER_ROLES,
  PUBLISHER_ALLOWED_TARGETS,
  normalizeTargetRole,
  normalizeTargetRoles,
  resolveDocTargetRoles,
  canPublisherUseTargets,
  viewerMatchesTargets
};
