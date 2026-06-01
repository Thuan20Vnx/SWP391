const STUDENT_FREE_ROLES = new Set(['student', 'staff', 'partner']);

/** Roles được phép đăng ký / tham gia sự kiện */
const EVENT_PARTICIPANT_ROLES = ['student', 'staff', 'guest', 'partner'];

const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const hasStudentTicketPrivilege = (user) => {
  if (!user?.role) return false;
  return STUDENT_FREE_ROLES.has(String(user.role).toLowerCase());
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
  hasStudentTicketPrivilege,
  getListPrice,
  calculateTicketAmount,
  buildPriceLabel,
  getPrimaryActionLabel,
  enrichEventWithPricing,
  formatVnd,
};
