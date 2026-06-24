const STUDENT_FREE_ROLES = new Set(['student', 'staff', 'partner']);

export const hasStudentTicketPrivilege = (role) =>
  STUDENT_FREE_ROLES.has(String(role || '').toLowerCase());

export const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

export const calculateTicketAmount = (role, ticketPrice = 0) => {
  const listPrice = Math.max(0, Number(ticketPrice) || 0);
  if (hasStudentTicketPrivilege(role)) return 0;
  return listPrice;
};

export const buildPriceLabel = (amountDue, listPrice, role) => {
  if (amountDue === 0 && listPrice > 0 && hasStudentTicketPrivilege(role)) {
    return 'MIỄN PHÍ';
  }
  if (amountDue === 0) return 'MIỄN PHÍ';
  return formatVnd(amountDue);
};

export const getPrimaryActionLabel = ({
  amountDue,
  listPrice,
  isRegistered,
  eventState,
}) => {
  if (eventState === 'expired') return 'Đã hết hạn';
  if (eventState === 'postponed') return 'Xem chi tiết';
  if (isRegistered) return 'Xem vé';
  if (amountDue > 0 || listPrice > 0) {
    return amountDue > 0 ? 'Mua vé' : 'Đăng ký ngay';
  }
  return 'Đăng ký ngay';
};

/** Luôn tính lại theo role hiện tại — tránh cache danh sách (guest) hiển thị sai giá cho SV. */
export const resolveEventPricing = (event, role = 'guest') => {
  const listPrice = Math.max(0, Number(event.listPrice ?? event.ticketPrice) || 0);
  const amountDue = calculateTicketAmount(role, listPrice);
  const studentPrivilegeApplied = listPrice > 0 && amountDue === 0 && hasStudentTicketPrivilege(role);

  return {
    listPrice,
    amountDue,
    priceLabel: buildPriceLabel(amountDue, listPrice, role),
    studentPrivilegeApplied,
    primaryActionLabel: getPrimaryActionLabel({
      amountDue,
      listPrice,
      isRegistered: event.isRegistered === true,
      eventState: event.eventState || 'active',
    }),
  };
};
