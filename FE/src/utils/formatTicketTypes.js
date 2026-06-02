import { formatVnd } from './ticketPricing';

export const formatTicketTypePrice = (row) => {
  if (!row) return '—';
  if (row.priceType === 'free') return 'Miễn phí';
  const amount = Math.max(0, Number(row.priceAmount) || 0);
  return amount > 0 ? formatVnd(amount) : 'Có phí (chưa nhập)';
};

export const hasTicketPricing = (item) => {
  if (!item) return false;
  if (Array.isArray(item.ticketTypes) && item.ticketTypes.length > 0) return true;
  return Math.max(0, Number(item.ticketPrice) || 0) > 0;
};
