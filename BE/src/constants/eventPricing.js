const STUDENT_FREE_ROLES = new Set([
  'student',
  'staff',
  'partner',
  'club_manager',
  'ctsv',
  'icpdp',
]);

/** Roles được phép đăng ký / tham gia sự kiện */
const EVENT_PARTICIPANT_ROLES = ['student', 'staff', 'guest', 'partner'];

const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const hasStudentTicketPrivilege = (user) => {
  if (!user?.role) return false;
  return STUDENT_FREE_ROLES.has(String(user.role).toLowerCase());
};

// Nhóm đối tượng của từng loại vé (đồng bộ FE utils/eventTicketTypes.js).
const TICKET_AUDIENCE = {
  STUDENT: 'SV FPT',
  GUEST: 'Khách ngoài trường',
  ALL: 'Tất cả',
};

/**
 * Suy ra sự kiện đang mở cho nhóm nào từ các loại vé còn mở (qty > 0).
 * Sự kiện không khai báo ticketTypes (dữ liệu cũ) → không ràng buộc, cho đăng ký như trước.
 */
const resolveEventAudiences = (event) => {
  const types = Array.isArray(event?.ticketTypes) ? event.ticketTypes : [];
  const open = types.filter((t) => (Number(t.qty) || 0) > 0);
  if (open.length === 0) {
    return { allowsStudent: true, allowsGuest: true, restricted: false };
  }
  const audiences = new Set(open.map((t) => t.audience || TICKET_AUDIENCE.STUDENT));
  const allowsStudent = audiences.has(TICKET_AUDIENCE.STUDENT) || audiences.has(TICKET_AUDIENCE.ALL);
  const allowsGuest = audiences.has(TICKET_AUDIENCE.GUEST) || audiences.has(TICKET_AUDIENCE.ALL);
  return { allowsStudent, allowsGuest, restricted: true };
};

/**
 * Người dùng có thuộc nhóm đối tượng mà sự kiện phục vụ không.
 * Nội bộ FPT (có ưu đãi miễn phí) khớp vé "SV FPT"; khách ngoài trường khớp vé "Khách".
 */
const canUserRegisterEvent = (user, event) => {
  const { allowsStudent, allowsGuest } = resolveEventAudiences(event);
  return hasStudentTicketPrivilege(user) ? allowsStudent : allowsGuest;
};

const getListPrice = (event) => Math.max(0, Number(event?.ticketPrice) || 0);

const calculateTicketAmount = (user, event) => {
  const listPrice = getListPrice(event);
  if (hasStudentTicketPrivilege(user)) return 0;
  return listPrice;
};

const buildPriceLabel = (amountDue, listPrice, user) => {
  if (amountDue === 0 && listPrice > 0 && hasStudentTicketPrivilege(user)) {
    return 'MIỄN PHÍ';
  }
  if (amountDue === 0) return 'MIỄN PHÍ';
  return formatVnd(amountDue);
};

const getPrimaryActionLabel = ({ amountDue, listPrice, isRegistered, eventState }) => {
  if (eventState === 'expired') return 'Đã hết hạn';
  if (eventState === 'postponed') return 'Xem chi tiết';
  if (isRegistered) return 'Xem vé';
  if (amountDue > 0) return 'Mua vé';
  return 'Đăng ký ngay';
};

const enrichEventWithPricing = (event, user = null) => {
  const listPrice = getListPrice(event);
  const amountDue = user ? calculateTicketAmount(user, event) : listPrice;
  const studentPrivilegeApplied = listPrice > 0 && amountDue === 0 && hasStudentTicketPrivilege(user);

  return {
    ...event,
    listPrice,
    amountDue,
    isFreeForUser: amountDue === 0,
    studentPrivilegeApplied,
    priceLabel: buildPriceLabel(amountDue, listPrice, user),
    primaryActionLabel: getPrimaryActionLabel({
      amountDue,
      listPrice,
      isRegistered: event.isRegistered === true,
      eventState: event.eventState || 'active',
    }),
  };
};

module.exports = {
  STUDENT_FREE_ROLES,
  EVENT_PARTICIPANT_ROLES,
  TICKET_AUDIENCE,
  hasStudentTicketPrivilege,
  resolveEventAudiences,
  canUserRegisterEvent,
  getListPrice,
  calculateTicketAmount,
  buildPriceLabel,
  getPrimaryActionLabel,
  enrichEventWithPricing,
  formatVnd,
};
