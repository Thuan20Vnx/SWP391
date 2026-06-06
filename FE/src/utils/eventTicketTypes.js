export const TICKET_AUDIENCE_VALUES = ['SV FPT', 'Khách ngoài trường', 'Tất cả'];

export const TICKET_AUDIENCE_OPTIONS = [
  { value: 'SV FPT', label: 'Sinh viên' },
  { value: 'Khách ngoài trường', label: 'Khách' },
  { value: 'Tất cả', label: 'Tất cả' },
];

export const DEFAULT_EVENT_TICKETS = [
  { id: 1, name: 'Vé sinh viên', audience: 'SV FPT', qty: 50, priceAmount: 0 },
  { id: 2, name: 'Vé khách mời', audience: 'Khách ngoài trường', qty: 10, priceAmount: 0 },
];

let _ticketRowSeq = 100;

export const createEmptyTicketRow = (overrides = {}) => ({
  id: ++_ticketRowSeq,
  name: '',
  audience: 'SV FPT',
  qty: 0,
  priceAmount: 0,
  ...overrides,
});

export const formatTicketPriceLabel = (priceAmount) => {
  const n = Math.max(0, Number(priceAmount) || 0);
  return n > 0 ? `${n.toLocaleString('vi-VN')} VNĐ` : 'Miễn phí';
};

export const audienceLabel = (audience) => {
  const opt = TICKET_AUDIENCE_OPTIONS.find((o) => o.value === audience);
  return opt?.label || audience || '—';
};

export const totalTicketQty = (tickets = []) =>
  (tickets || []).reduce((sum, t) => sum + Math.max(0, Number(t.qty) || 0), 0);

export const deriveTicketPriceFromTypes = (tickets = []) => {
  const paid = (tickets || []).filter((t) => (Number(t.priceAmount) || 0) > 0);
  if (!paid.length) return 0;
  return Math.max(...paid.map((t) => Number(t.priceAmount) || 0));
};

export const mapTicketTypesFromApi = (ticketTypes, fallbackCapacity = 100, legacyTicketPrice = 0) => {
  if (Array.isArray(ticketTypes) && ticketTypes.length) {
    return ticketTypes.map((t, i) => ({
      id: i + 1,
      name: t.name || '',
      audience: TICKET_AUDIENCE_VALUES.includes(t.audience) ? t.audience : 'SV FPT',
      qty: Number(t.qty ?? t.quantity) || 0,
      priceAmount:
        t.priceType === 'paid' ? Math.max(0, Number(t.priceAmount) || 0) : 0,
    }));
  }
  const cap = Math.max(1, Number(fallbackCapacity) || 100);
  const price = Math.max(0, Number(legacyTicketPrice) || 0);
  return [
    {
      id: 1,
      name: price > 0 ? 'Vé tham dự' : 'Vé miễn phí',
      audience: 'SV FPT',
      qty: cap,
      priceAmount: price,
    },
  ];
};

export const normalizeFormTicketTypes = (tickets = []) =>
  (tickets || []).map((t) => {
    const priceAmount = Math.max(0, Number(t.priceAmount) || 0);
    return {
      name: String(t.name || '').trim() || 'Vé tham dự',
      priceType: priceAmount > 0 ? 'paid' : 'free',
      priceAmount,
      qty: Math.max(0, Number(t.qty) || 0),
      audience: t.audience || 'SV FPT',
    };
  });

export const formatTicketTypesSummary = (tickets = []) => {
  const rows = tickets || [];
  if (!rows.length) return 'Chưa có loại vé';
  return rows
    .map((t) => {
      const qty = Number(t.qty) || 0;
      const price = formatTicketPriceLabel(t.priceAmount);
      const who = audienceLabel(t.audience);
      const name = t.name?.trim() || 'Vé';
      return `${name} (${who}): ${qty} × ${price}`;
    })
    .join(' · ');
};

export const validateTicketTypesStep = (form) => {
  const tickets = form.ticketTypes || [];
  if (!tickets.length) {
    return 'Vui lòng thêm ít nhất một loại vé.';
  }
  const invalid = tickets.find((t) => !String(t.name || '').trim() || !(Number(t.qty) > 0));
  if (invalid) {
    return 'Mỗi loại vé cần tên và số lượng lớn hơn 0.';
  }
  const total = totalTicketQty(tickets);
  const max = parseInt(form.maxSlots, 10) || 0;
  if (max > 0 && total > max) {
    return `Tổng số vé (${total}) vượt quá số lượng tối đa (${max}).`;
  }
  return null;
};
