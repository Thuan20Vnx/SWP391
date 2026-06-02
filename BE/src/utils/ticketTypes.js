const normalizeTicketTypes = (ticketTypes) => {
  if (!Array.isArray(ticketTypes)) return [];
  return ticketTypes.map((t) => ({
    name: String(t.name || '').trim(),
    priceType: t.priceType === 'paid' ? 'paid' : 'free',
    priceAmount: t.priceType === 'paid' ? Math.max(0, Number(t.priceAmount) || 0) : 0,
    qty: Math.max(0, Number(t.qty) || 0),
    audience: t.audience || 'SV FPT'
  }));
};

/** Giá niêm yết chính — lấy mức cao nhất trong các loại vé có phí. */
const deriveTicketPriceFromTypes = (ticketTypes) => {
  const paid = normalizeTicketTypes(ticketTypes).filter(
    (t) => t.priceType === 'paid' && t.priceAmount > 0
  );
  if (paid.length === 0) return 0;
  return Math.max(...paid.map((t) => t.priceAmount));
};

const totalQtyFromTypes = (ticketTypes) =>
  normalizeTicketTypes(ticketTypes).reduce((sum, t) => sum + (t.qty || 0), 0);

module.exports = {
  normalizeTicketTypes,
  deriveTicketPriceFromTypes,
  totalQtyFromTypes
};
