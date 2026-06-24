import { resolveEventPricing } from './ticketPricing';

/** Chuẩn hóa object sự kiện (API / card) để tính giá vé. */
export const normalizeEventForPricing = (event) => ({
  ticketPrice: event.ticketPrice ?? event.listPrice,
  listPrice: event.listPrice,
  isRegistered: event.isRegistered === true || event.registered === true,
  eventState:
    event.eventState ||
    (event.cardState === 'expired'
      ? 'expired'
      : event.cardState === 'postponed'
        ? 'postponed'
        : 'active'),
});

/** Vé có phí với role hiện tại — phải qua checkout, không đăng ký trực tiếp. */
export const eventRequiresPayment = (event, role = 'guest') => {
  const pricing = resolveEventPricing(normalizeEventForPricing(event), role);
  return pricing.amountDue > 0;
};
